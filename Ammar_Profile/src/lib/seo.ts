import { profile, type Language } from "../data/profile";
import { dictionaries } from "../data/ui";
import { projects } from "../data/projects";
export function pageMetadata(path: string, lang: Language) {
  const t = dictionaries[lang];
  const project = projects.find(
    (p) => path.replace(/\/$/, "") === `/${lang}/projects/${p.slug}`,
  );
  return {
    title: project
      ? `${project.copy[lang].title} | ${profile.name[lang]}`
      : t.seoTitle,
    description: project ? project.copy[lang].summary : t.seoDescription,
    project,
  };
}
export function structuredData(path: string, lang: Language, siteUrl?: string) {
  const { project } = pageMetadata(path, lang);
  const person = {
    "@type": "Person",
    name: profile.name[lang],
    alternateName: profile.fullName,
    jobTitle: dictionaries[lang].role,
    email: profile.email,
    telephone: profile.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Al Hudaydah",
      addressCountry: "YE",
    },
    sameAs: [profile.github, profile.linkedin],
    ...(siteUrl ? { url: `${siteUrl}/${lang}` } : {}),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "WebSite",
        name: profile.name[lang],
        inLanguage: lang,
        ...(siteUrl ? { url: siteUrl } : {}),
        author: { "@type": "Person", name: profile.name[lang] },
      },
      ...(project
        ? [
            {
              "@type": "CreativeWork",
              name: project.copy[lang].title,
              description: project.copy[lang].summary,
              inLanguage: lang,
              ...(project.team
                ? {
                    contributor: {
                      "@type": "Person",
                      name: profile.name[lang],
                    },
                  }
                : { author: { "@type": "Person", name: profile.name[lang] } }),
              ...(siteUrl ? { url: siteUrl + path } : {}),
              ...(project.website ? { sameAs: project.website } : {}),
            },
          ]
        : []),
    ],
  };
}
