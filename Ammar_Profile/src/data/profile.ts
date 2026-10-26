export type Language = "ar" | "en";
export const profile = {
  name: { ar: "عمار زهير المقطري", en: "Ammar Zuhair Al-Maqtary" },
  fullName: "عمار زهير علي سيف المقطري",
  email: "pro.am.zuhair@gmail.com",
  phone: "+967775479340",
  github: "https://github.com/Ammar-Zuhair",
  linkedin: "https://www.linkedin.com/in/ammar-al-maqtary-3b2489391",
  // Add an approved real portrait to public/images and set its dimensions here.
  portrait: null as { src: string; width: number; height: number } | null,
  // Only enable when the real file exists in public/documents.
  cv: null as {
    href: string;
    format: string;
    language: Record<Language, string>;
  } | null,
};
