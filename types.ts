export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  isEditableByUser: boolean;
  editKey?: EditableFieldKey; // e.g., 'teacherName', 'schoolYear'
}

export interface LogoOverlay {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  radius: number;
  isEditableByUser: boolean;
  editKey?: EditableFieldKey.LOGO_URL;
}

export interface ImageConfig {
  id: string;
  name: string; // User-friendly name for the template
  category: TemplateCategory;
  imageUrl: string;
  overlays: TextOverlay[];
  logoOverlay?: LogoOverlay | null;
  canvasWidth: number; // Store canvas dimensions for consistent rendering
  canvasHeight: number;
}

export enum TemplateCategory {
  NOTES = 'notes',
  GRADES = 'grades',
  PLAN = 'plan',
  ADMINISTRATIVE = 'administrative',
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TemplateCategory.NOTES]: "الملازم الدراسية",
  [TemplateCategory.GRADES]: "سجلات الدرجات",
  [TemplateCategory.PLAN]: "الخطة اليومية",
  [TemplateCategory.ADMINISTRATIVE]: "سجلات ادارية",
};

export enum EditableFieldKey {
  TEACHER_NAME = 'teacherName',
  SCHOOL_YEAR = 'schoolYear',
  PRINCIPAL_NAME = 'principalName', // Changed from STUDENT_NAME
  CLASS_NAME = 'className',
  PHONE_NUMBER = 'phoneNumber',     // New key
  OPTIONAL_ADDITION = 'optionalAddition', // New key
  SCHOOL_NAME = 'schoolName', // New key
  SECTION_NAME = 'sectionName', // New key
  DIRECTORATE_NAME = 'directorateName',
  SUBJECT = 'subject',
  LOGO_URL = 'logoUrl',
  RECORD_NUMBER = 'recordNumber',
}

export const EDITABLE_FIELD_LABELS: Record<EditableFieldKey, string> = {
  [EditableFieldKey.TEACHER_NAME]: "اسم المدرس",
  [EditableFieldKey.SCHOOL_YEAR]: "السنة الدراسية",
  [EditableFieldKey.PRINCIPAL_NAME]: "اسم مدير المدرسة", // Changed label
  [EditableFieldKey.CLASS_NAME]: "اسم الصف",
  [EditableFieldKey.PHONE_NUMBER]: "رقم الهاتف",        // New label
  [EditableFieldKey.OPTIONAL_ADDITION]: "إضافة اختيارية", // New label
  [EditableFieldKey.SCHOOL_NAME]: "اسم المدرسة",        // New label
  [EditableFieldKey.SECTION_NAME]: "الشعبة",            // New label
  [EditableFieldKey.DIRECTORATE_NAME]: "اسم المديرية",
  [EditableFieldKey.SUBJECT]: "المادة",
  [EditableFieldKey.LOGO_URL]: "رابط صورة الشعار (اللوكو)",
  [EditableFieldKey.RECORD_NUMBER]: "رقم السجل",
};

export interface UserEdits {
  [key: string]: string; // e.g., { teacherName: "الأستاذ أحمد", schoolYear: "2023-2024" }
}