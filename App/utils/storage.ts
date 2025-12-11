// Initialize window.storage for web
   declare global {
     interface Window {
       storage: {
         get: (key: string) => Promise<{ value: string } | null>;
         set: (key: string, value: string) => Promise<void>;
       };
     }
   }

   if (typeof window !== 'undefined' && !window.storage) {
     window.storage = {
       get: async (key: string) => {
         try {
           const value = localStorage.getItem(key);
           return value ? { value } : null;
         } catch (error) {
           console.error('Storage get error:', error);
           return null;
         }
       },
       set: async (key: string, value: string) => {
         try {
           localStorage.setItem(key, value);
         } catch (error) {
           console.error('Storage set error:', error);
         }
       },
     };
   }

   export {};