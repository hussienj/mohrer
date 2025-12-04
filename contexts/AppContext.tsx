
import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { CredentialResponse } from '@react-oauth/google';
import { ImageConfig } from '../types';
import { ADMIN_EMAILS } from '../constants';
import { getDatabase, ref, onValue, push, set, remove, off, DatabaseReference } from "firebase/database";
import { getAuth, onAuthStateChanged, signInWithCredential, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { firebaseApp } from '../firebase';

export interface CurrentUser {
  email: string;
  name: string;
  picture?: string;
}

interface AppContextType {
  isAdmin: boolean; 
  currentUser: CurrentUser | null;
  loginUser: (credentialResponse: CredentialResponse) => void;
  logoutUser: () => void;
  imageTemplates: ImageConfig[];
  addImageTemplate: (templateData: Omit<ImageConfig, 'id'>) => Promise<DatabaseReference | void>;
  updateImageTemplate: (template: ImageConfig) => Promise<void>;
  deleteImageTemplate: (templateId: string) => Promise<void>;
  loadTemplates: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [imageTemplates, setImageTemplates] = useState<ImageConfig[]>([]);

  const isAdmin = useMemo(() => {
    return !!currentUser && ADMIN_EMAILS.includes(currentUser.email);
  }, [currentUser]);

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          email: user.email!,
          name: user.displayName!,
          picture: user.photoURL || undefined,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const loginUser = useCallback(async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      try {
        const auth = getAuth(firebaseApp);
        const credential = GoogleAuthProvider.credential(credentialResponse.credential);
        await signInWithCredential(auth, credential);
        // onAuthStateChanged will set the user state
      } catch (error) {
        console.error("Firebase sign-in error:", error);
        alert('فشل تسجيل الدخول عبر Firebase. يرجى مراجعة إعدادات Firebase Authentication في مشروعك.');
      }
    } else {
      console.error("Google login failed: No credential in response.");
    }
  }, []);

  const logoutUser = useCallback(() => {
    const auth = getAuth(firebaseApp);
    signOut(auth).catch(error => console.error("Firebase sign-out error:", error));
  }, []);

  const loadTemplates = useCallback(() => {
    const db = getDatabase(firebaseApp);
    const templatesRef = ref(db, 'imageTemplates');
    
    off(templatesRef); 

    onValue(templatesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedTemplates: ImageConfig[] = Object.entries(data).map(([key, value]) => ({
          ...(value as Omit<ImageConfig, 'id'>), 
          id: key, 
        }));
        setImageTemplates(loadedTemplates);
      } else {
        setImageTemplates([]);
      }
    }, (error) => {
      console.error("Error loading templates from Firebase:", error);
      alert(`فشل تحميل القوالب من Firebase: ${error.message}`);
      setImageTemplates([]); 
    });
  }, []);
  
  useEffect(() => {
    loadTemplates();
    
    return () => {
      const db = getDatabase(firebaseApp);
      const templatesRef = ref(db, 'imageTemplates');
      off(templatesRef);
    };
  }, [loadTemplates]);


  const addImageTemplate = (templateData: Omit<ImageConfig, 'id'>): Promise<DatabaseReference | void> => {
    if (!isAdmin) {
      alert("ليس لديك صلاحية لإضافة قوالب.");
      return Promise.reject(new Error("Permission Denied"));
    }
    const db = getDatabase(firebaseApp);
    const templatesRef = ref(db, 'imageTemplates');
    return push(templatesRef, templateData)
        .then((newRef) => {
            console.log("addImageTemplate: Template added to Firebase successfully! Ref ID:", newRef.key);
            alert("تم إضافة القالب إلى Firebase بنجاح!");
            return newRef;
        })
        .catch((error) => {
            console.error("addImageTemplate: Error adding template to Firebase. Code:", error.code, "Message:", error.message, "Full error object:", error);
            alert(`فشل إضافة القالب إلى Firebase: ${error.message} (الرمز: ${error.code})`);
            throw error;
        });
  };

  const updateImageTemplate = (updatedTemplate: ImageConfig): Promise<void> => {
    if (!isAdmin) {
      alert("ليس لديك صلاحية لتحديث القوالب.");
      return Promise.reject(new Error("Permission Denied"));
    }
    const db = getDatabase(firebaseApp);
    const { id, ...templateData } = updatedTemplate;
    if (!id) {
        const errMessage = "updateImageTemplate: Template ID is missing. Cannot update.";
        console.error(errMessage, updatedTemplate);
        alert("خطأ: معرّف القالب مفقود، لا يمكن التحديث.");
        return Promise.reject(new Error(errMessage));
    }
    const templateRef = ref(db, `imageTemplates/${id}`);
    return set(templateRef, templateData)
        .then(() => {
            console.log("updateImageTemplate: Template updated in Firebase successfully! ID:", id);
            alert("تم تحديث القالب في Firebase بنجاح!");
        })
        .catch((error) => {
            console.error("updateImageTemplate: Error updating template in Firebase. Code:", error.code, "Message:", error.message, "Full error object:", error);
            alert(`فشل تحديث القالب في Firebase: ${error.message} (الرمز: ${error.code})`);
            throw error;
        });
  };

  const deleteImageTemplate = (templateId: string): Promise<void> => {
    if (!isAdmin) {
      alert("ليس لديك صلاحية لحذف القوالب.");
      return Promise.reject(new Error("Permission Denied"));
    }
    const db = getDatabase(firebaseApp);
    if (!templateId) {
        const errMessage = "deleteImageTemplate: Template ID is missing. Cannot delete.";
        console.error(errMessage);
        alert("خطأ: معرّف القالب مفقود، لا يمكن الحذف.");
        return Promise.reject(new Error(errMessage));
    }
    const templateRef = ref(db, `imageTemplates/${templateId}`);
    return remove(templateRef)
        .then(() => {
            console.log("deleteImageTemplate: Template deleted from Firebase successfully! ID:", templateId);
            alert("تم حذف القالب من Firebase بنجاح!");
        })
        .catch((error) => {
            console.error("deleteImageTemplate: Error deleting template from Firebase. Code:", error.code, "Message:", error.message, "Full error object:", error);
            alert(`فشل حذف القالب من Firebase: ${error.message} (الرمز: ${error.code})`);
            throw error;
        });
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
          <p className="text-white text-xl animate-pulse">جاري التحقق من الهوية...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        isAdmin,
        currentUser,
        loginUser,
        logoutUser,
        imageTemplates,
        addImageTemplate,
        updateImageTemplate,
        deleteImageTemplate,
        loadTemplates,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
