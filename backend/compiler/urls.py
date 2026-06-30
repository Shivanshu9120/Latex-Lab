from django.urls import path
from .views import CompileView, DocumentListView, DocumentDetailView, SignupView, LoginView, LogoutView, MeView


urlpatterns = [
    path('compile/', CompileView.as_view(), name='compile'),
    path('documents/', DocumentListView.as_view(), name='document-list'),
    path('documents/<str:doc_id>/', DocumentDetailView.as_view(), name='document-detail'),
    path('auth/signup/', SignupView.as_view(), name='auth-signup'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
]
