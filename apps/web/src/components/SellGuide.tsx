"use client";

import { useI18n } from "@/components/I18nProvider";

export function SellGuide() {
  const { t } = useI18n();

  const sections: Array<{ title: string; points: string[] }> = [
    {
      title: t("sell.guide.register.title"),
      points: [
        t("sell.guide.register.point1"),
        t("sell.guide.register.point2"),
        t("sell.guide.register.point3")
      ]
    },
    {
      title: t("sell.guide.photos.title"),
      points: [
        t("sell.guide.photos.point1"),
        t("sell.guide.photos.point2"),
        t("sell.guide.photos.point3"),
        t("sell.guide.photos.point4")
      ]
    },
    {
      title: t("sell.guide.specs.title"),
      points: [
        t("sell.guide.specs.point1"),
        t("sell.guide.specs.point2"),
        t("sell.guide.specs.point3"),
        t("sell.guide.specs.point4")
      ]
    },
    {
      title: t("sell.guide.options.title"),
      points: [
        t("sell.guide.options.point1"),
        t("sell.guide.options.point2")
      ]
    },
    {
      title: t("sell.guide.description.title"),
      points: [
        t("sell.guide.description.point1"),
        t("sell.guide.description.point2"),
        t("sell.guide.description.point3")
      ]
    },
    {
      title: t("sell.guide.price.title"),
      points: [
        t("sell.guide.price.point1"),
        t("sell.guide.price.point2"),
        t("sell.guide.price.point3")
      ]
    },
    {
      title: t("sell.guide.contacts.title"),
      points: [
        t("sell.guide.contacts.point1"),
        t("sell.guide.contacts.point2")
      ]
    },
    {
      title: t("sell.guide.publish.title"),
      points: [
        t("sell.guide.publish.point1"),
        t("sell.guide.publish.point2")
      ]
    },
    {
      title: t("sell.guide.free.title"),
      points: [
        t("sell.guide.free.point1"),
        t("sell.guide.free.point2")
      ]
    },
    {
      title: t("sell.guide.visibility.title"),
      points: [
        t("sell.guide.visibility.point1"),
        t("sell.guide.visibility.point2"),
        t("sell.guide.visibility.point3")
      ]
    },
    {
      title: t("sell.guide.tips.title"),
      points: [
        t("sell.guide.tips.point1"),
        t("sell.guide.tips.point2"),
        t("sell.guide.tips.point3")
      ]
    }
  ];

  return (
    <div className="glass sell-guide">
      <div>
        <h3 className="section-title" style={{ marginBottom: "0.4rem" }}>{t("sell.guide.title")}</h3>
        <p className="muted">{t("sell.guide.subtitle")}</p>
      </div>
      <div className="sell-guide__grid">
        {sections.map((section) => (
          <div key={section.title} className="sell-guide__card">
            <div className="sell-guide__title">{section.title}</div>
            <ul className="muted sell-guide__list">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
