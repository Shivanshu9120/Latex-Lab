import os
import subprocess
import tempfile
from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .transpiler import compile_latex_to_pdf_bytes

class CompileView(APIView):
    def post(self, request):
        code = request.data.get("code", "")
        mode = request.query_params.get("mode", "level1")
        
        if not code.strip():
            return Response(
                {"error": "LaTeX source code cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if mode == "level1":
            return self.compile_level1(code)
        elif mode == "level2":
            return self.compile_level2(code)
        else:
            return Response(
                {"error": f"Invalid mode '{mode}'. Use 'level1' or 'level2'."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    def compile_level1(self, code):
        """
        Level 1: Spawns the local tectonic executable to compile LaTeX to PDF.
        """
        import traceback
        import shutil
        
        try:
            # Define compiler executable path
            # Detect platform dynamically to support Windows (local) and Linux (Render production)
            import platform
            is_windows = platform.system() == "Windows"
            binary_name = "tectonic.exe" if is_windows else "tectonic"
            
            # Check settings.BASE_DIR, and also try parent if BASE_DIR/binary_name doesn't exist
            compiler_path = os.path.join(settings.BASE_DIR, binary_name)
            if not os.path.exists(compiler_path):
                # Fallback to repo root parent directory if settings.BASE_DIR is backend
                fallback_path = os.path.join(settings.BASE_DIR.parent, binary_name)
                if os.path.exists(fallback_path):
                    compiler_path = fallback_path
            
            if not os.path.exists(compiler_path):
                return Response(
                    {
                        "error": f"Tectonic compiler binary '{binary_name}' not found in backend directory.",
                        "details": f"Checked paths: {os.path.join(settings.BASE_DIR, binary_name)} and {os.path.join(settings.BASE_DIR.parent, binary_name) if hasattr(settings.BASE_DIR, 'parent') else 'none'}"
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            # Create an isolated temporary workspace directory manually to avoid context manager cleanup failures
            temp_dir = tempfile.mkdtemp()
            try:
                tex_file_path = os.path.join(temp_dir, "document.tex")
                pdf_file_path = os.path.join(temp_dir, "document.pdf")
                
                # Write the user code to document.tex
                with open(tex_file_path, "w", encoding="utf-8") as f:
                    f.write(code)
                    
                try:
                    # Execute Tectonic compiler CLI in temp directory
                    # Set custom cache directory inside /tmp to ensure permissions and persist cache across requests
                    env = os.environ.copy()
                    env["TECTONIC_CACHE_DIR"] = os.path.join(tempfile.gettempdir(), "tectonic_cache")
                    
                    result = subprocess.run(
                        [compiler_path, tex_file_path, "-o", temp_dir],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        timeout=35, # Ensure long runs terminate
                        text=True,
                        env=env
                    )
                    
                    # If exit code is not 0, compilation failed
                    if result.returncode != 0:
                        error_log = result.stderr if result.stderr.strip() else result.stdout
                        return Response(
                            {
                                "error": "LaTeX compilation failed.",
                                "log": error_log
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                        
                    # Read the generated PDF and stream it
                    if os.path.exists(pdf_file_path):
                        with open(pdf_file_path, "rb") as pdf_file:
                            pdf_data = pdf_file.read()
                        
                        response = HttpResponse(pdf_data, content_type="application/pdf")
                        response['Content-Disposition'] = 'inline; filename="document.pdf"'
                        return response
                    else:
                        return Response(
                            {"error": "Compilation succeeded but PDF file was not generated."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                        
                except subprocess.TimeoutExpired:
                    return Response(
                        {"error": "LaTeX compilation timed out (limit: 35 seconds)."},
                        status=status.HTTP_504_GATEWAY_TIMEOUT
                    )
                except Exception as e:
                    return Response(
                        {"error": f"Internal subprocess execution error: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            finally:
                # Ignore clean-up errors to prevent crashing the response
                shutil.rmtree(temp_dir, ignore_errors=True)
                
        except Exception as e:
            # Catch any other unexpected exceptions (e.g. tempfile creation failure)
            # Log traceback to console (Render stdout/stderr)
            traceback.print_exc()
            return Response(
                {
                    "error": f"Internal compiler view crash: {str(e)}",
                    "traceback": traceback.format_exc()
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
                
    def compile_level2(self, code):
        """
        Level 2: Transpiles LaTeX syntax to HTML and generates a PDF using xhtml2pdf.
        """
        try:
            pdf_data = compile_latex_to_pdf_bytes(code)
            
            response = HttpResponse(pdf_data, content_type="application/pdf")
            response['Content-Disposition'] = 'inline; filename="document.pdf"'
            return response
            
        except Exception as e:
            return Response(
                {
                    "error": "HTML-to-PDF Transpilation failed.",
                    "log": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )


from django.contrib.auth.hashers import make_password, check_password
from .auth_decorators import token_required
from .db import (
    save_document, 
    get_document, 
    list_documents, 
    create_user, 
    find_user_by_username_or_email, 
    create_session, 
    delete_session
)

class DocumentListView(APIView):
    @token_required
    def get(self, request):
        try:
            docs = list_documents(user_id=request.user["_id"])
            return Response(docs, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Failed to load documents: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @token_required
    def post(self, request):
        title = request.data.get("title", "Untitled Document")
        code = request.data.get("code", "")
        try:
            doc_id = save_document(title=title, source_code=code, user_id=request.user["_id"])
            return Response(
                {"id": doc_id, "message": "Document saved successfully."},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to save document: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DocumentDetailView(APIView):
    @token_required
    def get(self, request, doc_id):
        try:
            doc = get_document(doc_id, user_id=request.user["_id"])
            if not doc:
                return Response(
                    {"error": "Document not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(doc, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Failed to load document: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @token_required
    def put(self, request, doc_id):
        title = request.data.get("title")
        code = request.data.get("code")
        try:
            doc = get_document(doc_id, user_id=request.user["_id"])
            if not doc:
                return Response(
                    {"error": "Document not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            final_title = title if title is not None else doc.get("title")
            final_code = code if code is not None else doc.get("source_code")
            
            save_document(doc_id=doc_id, title=final_title, source_code=final_code, user_id=request.user["_id"])
            return Response(
                {"message": "Document updated successfully."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to update document: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ==================== AUTHENTICATION VIEWS ====================

class SignupView(APIView):
    def post(self, request):
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()
        
        if not username or not email or not password:
            return Response(
                {"error": "Username, email, and password are required fields."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if len(password) < 6:
            return Response(
                {"error": "Password must be at least 6 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            password_hash = make_password(password)
            user_id = create_user(username, email, password_hash)
            token = create_session(user_id)
            
            return Response({
                "message": "User registered successfully.",
                "token": token,
                "user": {
                    "username": username,
                    "email": email
                }
            }, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response(
                {"error": str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to register user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LoginView(APIView):
    def post(self, request):
        username_or_email = request.data.get("username", "").strip()
        password = request.data.get("password", "").strip()
        
        if not username_or_email or not password:
            return Response(
                {"error": "Username/Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user = find_user_by_username_or_email(username_or_email)
            if not user:
                return Response(
                    {"error": "Invalid username, email, or password."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            if not check_password(password, user["password_hash"]):
                return Response(
                    {"error": "Invalid username, email, or password."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            user_id = str(user["_id"])
            token = create_session(user_id)
            
            return Response({
                "message": "Login successful.",
                "token": token,
                "user": {
                    "username": user["username"],
                    "email": user["email"]
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Login failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LogoutView(APIView):
    def post(self, request):
        auth_header = request.headers.get('Authorization', '')
        token = None
        if auth_header.startswith('Token '):
            token = auth_header.split(' ')[1]
            
        if token:
            try:
                delete_session(token)
            except Exception:
                pass
                
        return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)

class MeView(APIView):
    @token_required
    def get(self, request):
        return Response(request.user, status=status.HTTP_200_OK)


