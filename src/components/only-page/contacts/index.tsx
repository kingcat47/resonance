import { Phone } from "lucide-react";

import { Typo, VStack } from "@/components/ui";

import s from "./styles.module.scss";

export interface EmergencyContact {
  name: string;
  number: string;
  desc: string;
}

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { name: "경찰", number: "112", desc: "긴급 상황, 범죄 신고" },
  { name: "소방·응급", number: "119", desc: "응급 환자, 구조 요청" },
  { name: "노인학대신고", number: "1577-0199", desc: "보건복지부 상담·신고" },
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
