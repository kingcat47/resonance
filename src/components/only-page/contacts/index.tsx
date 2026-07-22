import { Phone } from "lucide-react";

import { Typo, VStack } from "@/components/ui";

import s from "./styles.module.scss";

export interface EmergencyContact {
  name: string;
  number: string;
  desc: string;
}

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { name: "고용노동부", number: "1350", desc: "직장 내 괴롭힘 상담·신고" },
  { name: "노무사 콜센터", number: "1644-0853", desc: "노동권익 무료 상담" },
  { name: "경찰", number: "112", desc: "긴급 상황, 범죄 신고" },
];

interface ContactsProps {
  title?: string;
  contacts?: EmergencyContact[];
}

export default function Contacts({
  title = "긴급 연락처",
  contacts = DEFAULT_CONTACTS,
}: ContactsProps) {
  return (
    <section className={s.contacts}>
      <h2 className={s.title}>{title}</h2>
      <div className={s.grid}>
        {contacts.map((contact) => (
          <a
            key={contact.number}
            href={`tel:${contact.number.replace(/-/g, "")}`}
            className={s.card}
          >
            <Phone size={20} className={s.icon} />
            <VStack gap={4}>
              <Typo.BodyLarge className={s.name}>{contact.name}</Typo.BodyLarge>
              <span className={s.number}>{contact.number}</span>
              <Typo.Caption className={s.desc}>{contact.desc}</Typo.Caption>
            </VStack>
          </a>
        ))}
      </div>
    </section>
  );
}
