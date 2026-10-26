import { Link } from "react-router";
import {
  ArrowDown,
  Code2,
  Download,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  MapPin,
  Monitor,
  Server,
  Smartphone,
  Trophy,
  Wrench,
} from "lucide-react";
import { useLocale } from "../lib/useLocale";
import { profile } from "../data/profile";
import { projects } from "../data/projects";
import ProjectCard from "../components/ProjectCard";
import Contact from "../components/Contact";
import { DirectionArrow } from "../components/Icons";
const serviceIcons = [
  Monitor,
  Smartphone,
  Server,
  Layers3,
  LayoutDashboard,
  Wrench,
];
export default function Home() {
  const { text, lang } = useLocale();
  return (
    <>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span aria-hidden="true" />
            {text.eyebrow}
          </p>
          <p className="hero-hello">{text.hello}</p>
          <h1 id="hero-title">
            {text.heroStart}
            <br />
            <span>{text.heroMiddle}</span>
            <br />
            {text.heroEnd}
          </h1>
          <p className="hero-role">{text.role}</p>
          <p className="hero-description">{text.heroText}</p>
          <div className="hero-actions">
            <Link to={`/${lang}#work`} className="button primary">
              {text.viewWork}
              <DirectionArrow />
            </Link>
            <Link to={`/${lang}#contact`} className="text-link">
              {text.contact}
              <DirectionArrow />
            </Link>
          </div>
          {profile.cv && (
            <a className="cv-link" href={profile.cv.href} download>
              <Download size={17} aria-hidden="true" />
              {text.download}{" "}
              <bdi>
                ({profile.cv.format} · {profile.cv.language[lang]})
              </bdi>
            </a>
          )}
        </div>
        <div className="hero-visual">
          <div
            className="identity-art"
            role={profile.portrait ? undefined : "img"}
            aria-label={profile.portrait ? undefined : text.monogramAlt}
          >
            <div className="art-top" aria-hidden="true">
              <span>AMMAR ZUHAIR</span>
              <span>SOFTWARE ENGINEER</span>
            </div>
            <div className="art-grid" aria-hidden="true" />
            {profile.portrait ? (
              <img
                className="portrait"
                src={profile.portrait.src}
                width={profile.portrait.width}
                height={profile.portrait.height}
                alt={text.portraitAlt}
                fetchPriority="high"
              />
            ) : (
              <div className="art-monogram" aria-hidden="true">
                <span>a</span>
                <span>
                  z<span className="gold-dot">.</span>
                </span>
              </div>
            )}
            <div className="art-cross cross-one" aria-hidden="true">
              +
            </div>
            <div className="art-cross cross-two" aria-hidden="true">
              +
            </div>
            <div className="art-footer" aria-hidden="true">
              <Code2 size={23} strokeWidth={1.4} />
              <span>
                BUILDING WITH
                <br />
                INTENTION.
              </span>
            </div>
          </div>
          <div className="visual-caption">
            <span className="caption-line" aria-hidden="true" />
            <span>{text.monogramNote}</span>
          </div>
        </div>
        <div className="hero-bottom">
          <span>
            <MapPin size={15} aria-hidden="true" />
            {text.location}
          </span>
          <span>{text.opportunities}</span>
          <a href="#work" className="scroll-cue">
            {text.scroll}
            <ArrowDown size={17} aria-hidden="true" />
          </a>
        </div>
      </section>
      <div className="toolkit-strip" aria-label={text.coreTools}>
        <div className="container">
          <span>{text.coreTools}</span>
          <div>
            {["React", "React Native", "Node.js", "Express.js", "Next.js"].map(
              (item) => (
                <bdi key={item}>{item}</bdi>
              ),
            )}
          </div>
        </div>
      </div>
      <section id="work" className="container section-space work-section">
        <div className="section-heading reveal">
          <div>
            <p className="section-label">{text.workLabel}</p>
            <h2>{text.workTitle}</h2>
          </div>
          <p>{text.workText}</p>
        </div>
        <div className="featured-projects">
          {projects.slice(0, 2).map((project) => (
            <ProjectCard key={project.slug} project={project} featured />
          ))}
        </div>
        <div className="more-heading">
          <span>{text.moreWork}</span>
          <span aria-hidden="true">03 — 05</span>
        </div>
        <div className="project-grid">
          {projects.slice(2).map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
      <section id="services" className="services-section section-space">
        <div className="container">
          <div className="section-heading reveal">
            <div>
              <p className="section-label">{text.servicesLabel}</p>
              <h2>{text.servicesTitle}</h2>
            </div>
            <p>{text.servicesText}</p>
          </div>
          <div className="service-grid">
            {text.serviceItems.map((service, i) => {
              const Icon = serviceIcons[i];
              return (
                <article className="service-item reveal" key={service.title}>
                  <div className="service-top">
                    <Icon size={26} strokeWidth={1.4} aria-hidden="true" />
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <Link className="text-link" to={`/${lang}#contact`}>
                    {text.discuss}
                    <DirectionArrow />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section id="about" className="container section-space about-section">
        <div className="about-editorial reveal">
          <p className="section-label">{text.aboutLabel}</p>
          <h2>{text.aboutTitle}</h2>
          <p>{text.aboutText}</p>
          <p>{text.aboutText2}</p>
          <div className="approach-note">
            <span aria-hidden="true">↳</span>
            <div>
              <h3>{text.approach}</h3>
              <p>{text.approachText}</p>
              <p>{text.learningText}</p>
            </div>
          </div>
        </div>
        <div className="skills-section reveal">
          <h3>{text.coreTools}</h3>
          <div className="core-skills">
            {["React", "React Native", "Node.js", "Express.js", "Next.js"].map(
              (tech) => (
                <bdi key={tech}>{tech}</bdi>
              ),
            )}
          </div>
          <h3 className="other-skills-title">{text.otherTools}</h3>
          <dl className="skills-list">
            {[
              [text.web, "JavaScript · TypeScript · PHP · Laravel"],
              [text.mobile, "React Native · Flutter"],
              [text.backend, "Node.js · Express.js · .NET · Python"],
              [text.databases, "MongoDB · PostgreSQL · Supabase"],
              [text.tools, "Docker · Git · GitHub · Vite · Expo"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <bdi>{value}</bdi>
                </dd>
              </div>
            ))}
          </dl>
          <p className="skill-note">{text.skillNote}</p>
        </div>
      </section>
      <section id="journey" className="journey-section section-space">
        <div className="container">
          <div className="section-heading reveal">
            <div>
              <p className="section-label">{text.journeyLabel}</p>
              <h2>{text.journeyTitle}</h2>
            </div>
            <GraduationCap
              className="journey-heading-icon"
              size={48}
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>
          <div className="journey-grid">
            <div className="journey-column reveal">
              <h3>{text.education}</h3>
              <ol className="timeline">
                <li>
                  <span className="timeline-date">2026</span>
                  <h4>{text.degree}</h4>
                  <p>{text.degreeSpecialty}</p>
                  <p>{text.university}</p>
                  <span className="grade">{text.grade}</span>
                </li>
                <li>
                  <span className="timeline-date">2021</span>
                  <h4>{text.diploma}</h4>
                  <p>{text.institute}</p>
                </li>
              </ol>
            </div>
            <div className="journey-column reveal">
              <h3>{text.courses}</h3>
              <ol className="timeline">
                <li>
                  <span className="timeline-date">2026</span>
                  <h4>{text.courseMobile}</h4>
                  <p>{text.courseMobileText}</p>
                </li>
                <li>
                  <span className="timeline-date">2025</span>
                  <h4>{text.courseMern}</h4>
                  <p>{text.courseMernText}</p>
                </li>
                <li>
                  <h4>{text.courseAI}</h4>
                  <p>{text.courseAIText}</p>
                </li>
              </ol>
            </div>
            <div className="journey-column achievements reveal">
              <h3>{text.achievements}</h3>
              <div className="award-note">
                <Trophy size={27} strokeWidth={1.5} aria-hidden="true" />
                <h4>{text.award}</h4>
                <p>{text.awardText}</p>
                <Link to={`/${lang}/projects/hsa`} className="text-link">
                  HSA
                  <DirectionArrow />
                </Link>
              </div>
              <div className="activity-note">
                <h4>{text.participation}</h4>
                <p>{text.participationText}</p>
              </div>
              <div className="activity-note">
                <h4>{text.sharing}</h4>
                <p>{text.sharingText}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Contact />
    </>
  );
}
