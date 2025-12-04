
import React from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAppContext } from './contexts/AppContext';
import AdminDashboard from './components/AdminDashboard';
import UserView from './components/UserView';
import Button from './components/common/Button';
import { GOOGLE_CLIENT_ID } from './constants';

const App: React.FC = () => {
  const { currentUser, loginUser, logoutUser, isAdmin } = useAppContext();

  const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
    loginUser(credentialResponse);
  };

  const handleLoginError = () => {
    console.error('Google Login Failed');
    alert('فشل تسجيل الدخول باستخدام جوجل. يرجى المحاولة مرة أخرى.');
  };

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
    return (
      <div className="min-h-screen bg-slate-800 text-white flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">خطأ في الإعداد</h1>
        <p className="text-lg mb-2">
          لم يتم تكوين معرّف عميل جوجل (Google Client ID) بشكل صحيح.
        </p>
        <p className="text-md">
          يرجى التأكد من تعيين `GOOGLE_CLIENT_ID` في ملف `constants.ts` الخاص بك.
        </p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4 sm:p-8 font-sans">
        <header className="mb-8">
          <div className="container mx-auto flex justify-between items-center p-4 bg-slate-800/50 rounded-xl shadow-lg">
              <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                محرر المستندات
              </h1>
              <div className="flex items-center space-x-3 space-x-reverse">
                {currentUser ? (
                  <>
                    {currentUser.picture && (
                      <img 
                        src={currentUser.picture} 
                        alt={currentUser.name} 
                        className="w-10 h-10 rounded-full border-2 border-sky-400"
                      />
                    )}
                    <div className="hidden sm:block">
                      <p className="text-sm text-gray-300">مرحباً بك{isAdmin ? '، أيها المدير' : ''}</p>
                      <p className="font-semibold text-sky-300">{currentUser.name}</p>
                    </div>
                    <Button onClick={logoutUser} variant="secondary" size="sm">
                      تسجيل الخروج
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <GoogleLogin
                      onSuccess={handleLoginSuccess}
                      onError={handleLoginError}
                      theme="outline"
                      size="medium"
                      shape="rectangular"
                      text="signin_with"
                      logo_alignment="left"
                      locale="ar"
                    />
                     <p className="text-xs text-slate-400 mt-1 text-center">تسجيل دخول المسؤول</p>
                  </div>
                )}
              </div>
          </div>
        </header>
        
        <main>
            {isAdmin ? <AdminDashboard /> : <UserView />}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
};

export default App;
