import { Link, useParams } from "react-router";
import { Check, ExternalLink, CodeXml, LockKeyhole } from "lucide-react";
import { projects } from "../data/projects";
import { useLocale } from "../lib/useLocale";
import ProjectCover from "../components/ProjectCover";
import { DirectionArrow } from "../components/Icons";
import NotFound from "./NotFound";
export default function ProjectPage() {
  const { slug } = useParams();
  const { text, lang } = useLocale();
  const index = projects.findIndex((p) => p.slug === slug);
  if (index < 0) return <NotFound />;
  const project = projects[index];
  const copy = project.copy[lang];
  const next = projects[(index + 1) % projects.length];
  return (
    <>
      <article className="project-page container">
        <nav aria-label={text.projectLabel} className="breadcrumbs">
          <Link to={`/${lang}`}>{text.home}</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/${lang}#work`}>{text.work}</Link>
          <span aria-hidden="true">/</span>
          <span>{copy.title}</span>
        </nav>
        <div className="project-page-heading">
          <p className="section-label">
            {text.projectLabel} / {project.number}
          </p>
          <div className="project-title-row">
            <h1>{copy.title}</h1>
            <span className="project-type">
              {project.team ? text.team : text.individual}
            </span>
          </div>
          <p className="project-lead">{copy.summary}</p>
          <div className="project-links">
            {project.website && (
              <a
                href={project.website}
                className="button primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {text.visit}
                <ExternalLink size={17} aria-hidden="true" />
              </a>
            )}
            {project.publicRepo ? (
              <a
                href={project.publicRepo}
                className="button secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <CodeXml size={18} aria-hidden="true" />
                {text.source}
              </a>
            ) : (
              <span className="private-label">
                <LockKeyhole size={17} aria-hidden="true" />
                {text.privateRepo}
              </span>
            )}
          </div>
        </div>
        <ProjectCover project={project} large />
        <div className="project-main-grid">
          <div className="project-story">
            <section>
              <p className="section-label">01</p>
              <h2>{text.problem}</h2>
              <p>{copy.problem}</p>
            </section>
            <section>
              <p className="section-label">02</p>
              <h2>{text.solution}</h2>
              <p>{copy.solution}</p>
            </section>
          </div>
          <aside className="project-facts">
            <h2>{text.collaboration}</h2>
            <p>{project.team ? text.teamNote : text.soloNote}</p>
            <h2>{text.stack}</h2>
            <div className="tech-list">
              {project.technologies.map((tech) => (
                <bdi key={tech}>{tech}</bdi>
              ))}
            </div>
          </aside>
        </div>
        <section className="project-features">
          <p className="section-label">03 / {text.features}</p>
          <h2>{text.features}</h2>
          <div className="features-grid">
            {copy.features.map((feature) => (
              <div className="feature-item reveal" key={feature.title}>
                <Check size={20} aria-hidden="true" />
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        {project.screenshot && (
          <section className="project-screenshot">
            <h2>{text.screenshotTitle}</h2>
            <figure>
              <a
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${text.visit}: ${copy.title}`}
              >
                <img
                  src={`/images/projects/${project.screenshot}-1280.webp`}
                  srcSet={`/images/projects/${project.screenshot}-640.webp 640w, /images/projects/${project.screenshot}-1280.webp 1280w`}
                  sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1280px) calc(100vw - 96px), 1184px"
                  width={1280}
                  height={720}
                  alt={`${text.screenshotAlt} ${copy.title}`}
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <figcaption>{text.screenshotCaption}</figcaption>
            </figure>
          </section>
        )}
        <section className="verification-note">
          <h2>{text.context}</h2>
          <ul>
            {copy.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
        <div className="project-next">
          <span>{text.nextProject}</span>
          <Link to={`/${lang}/projects/${next.slug}`}>
            {next.copy[lang].title}
            <DirectionArrow />
          </Link>
        </div>
        <nav className="all-project-links" aria-label={text.allWork}>
          {projects.map((p) => (
            <Link
              to={`/${lang}/projects/${p.slug}`}
              key={p.slug}
              aria-current={p.slug === slug ? "page" : undefined}
            >
              {p.copy[lang].title}
            </Link>
          ))}
        </nav>
      </article>
      <section className="project-contact-cta">
        <div className="container">
          <div>
            <h2>{text.projectCta}</h2>
            <p>{text.projectCtaText}</p>
          </div>
          <Link to={`/${lang}#contact`} className="button primary">
            {text.discuss}
            <DirectionArrow />
          </Link>
        </div>
      </section>
    </>
  );
}
