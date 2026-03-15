export const translations = {
  en: {
    // Sidebar
    newChat: "New Chat",
    designer: "Designer",
    characters: "Characters",
    sessions: "Sessions",
    importRecord: "Import Record",
    settings: "Settings",
    
    // Header
    manageLorebooks: "Manage Lorebooks",
    editEntity: "Edit Entity",
    
    // Chat
    typeMessage: "Type a message...",
    send: "Send",
    stop: "Stop",
    continue: "Continue",
    regenerate: "Regenerate",
    translate: "Translate",
    edit: "Edit",
    delete: "Delete",
    copy: "Copy",
    
    // Settings
    language: "Language",
    interfaceVisuals: "Interface Visuals",
    backgroundImage: "Background Image",
    backgroundBlur: "Background Blur",
    backgroundOpacity: "Background Opacity",
    systemPrompt: "System Prompt",
    designerPersona: "Designer Persona",
    
    // Character Modal
    generate: "Generate",
    import: "Import",
    importFile: "Import File",
    importDataNow: "Import Data Now",
    continueWriting: "Continue Writing",
    saveEntity: "Save Entity",
    cancel: "Cancel",
    
    // Toast
    saved: "Saved successfully",
    error: "An error occurred",
  },
  ar: {
    // Sidebar
    newChat: "محادثة جديدة",
    designer: "المصمم",
    characters: "الشخصيات",
    sessions: "الجلسات",
    importRecord: "استيراد محادثة",
    settings: "الإعدادات",
    
    // Header
    manageLorebooks: "إدارة كتب المعرفة",
    editEntity: "تعديل الشخصية",
    
    // Chat
    typeMessage: "اكتب رسالة...",
    send: "إرسال",
    stop: "إيقاف",
    continue: "متابعة",
    regenerate: "إعادة توليد",
    translate: "ترجمة",
    edit: "تعديل",
    delete: "حذف",
    copy: "نسخ",
    
    // Settings
    language: "اللغة",
    interfaceVisuals: "المظهر",
    backgroundImage: "صورة الخلفية",
    backgroundBlur: "تمويه الخلفية",
    backgroundOpacity: "شفافية الخلفية",
    systemPrompt: "موجه النظام",
    designerPersona: "شخصية المصمم",
    
    // Character Modal
    generate: "توليد",
    import: "استيراد",
    importFile: "استيراد ملف",
    importDataNow: "استيراد البيانات الآن",
    continueWriting: "متابعة الكتابة",
    saveEntity: "حفظ الشخصية",
    cancel: "إلغاء",
    
    // Toast
    saved: "تم الحفظ بنجاح",
    error: "حدث خطأ",
  }
};

export type Language = 'en' | 'ar';
export type TranslationKey = keyof typeof translations.en;

export function useTranslation(lang: Language = 'en') {
  return {
    t: (key: TranslationKey) => translations[lang][key] || translations.en[key] || key,
    dir: lang === 'ar' ? 'rtl' : 'ltr'
  };
}
