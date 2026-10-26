import {
  CodeXml,
  BriefcaseBusiness,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { profile } from "../data/profile";
import { useLocale } from "../lib/useLocale";
import ContactForm from "./ContactForm";
import { DirectionArrow } from "./Icons";
export default function Contact() {
  const { text } = useLocale();
  return (
    <section id="contact" className="contact-section section-space">
      <div className="container contact-layout">
        <div className="contact-copy reveal">
          <p className="section-label">{text.contactLabel}</p>
          <h2>{text.contactTitle}</h2>
          <p className="contact-description">{text.contactText}</p>
          <a className="contact-email" href={`mailto:${profile.email}`}>
            <Mail size={20} aria-hidden="true" />
            <bdi>{profile.email}</bdi>
            <DirectionArrow />
          </a>
          <a className="contact-phone" href={`tel:${profile.phone}`}>
            <Phone size={18} aria-hidden="true" />
            <bdi>{profile.phone}</bdi>
          </a>
          <a
            className="whatsapp-link"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://wa.me/967775479340?text=${encodeURIComponent(text.whatsappMessage)}`}
          >
            <MessageCircle size={19} aria-hidden="true" />
            {text.whatsapp}
            <DirectionArrow />
          </a>
          <div className="contact-bottom">
            <span>
              <MapPin size={15} aria-hidden="true" />
              {text.location}
            </span>
            <div className="social-links">
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <CodeXml size={20} aria-hidden="true" />
              </a>
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <BriefcaseBusiness size={20} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
