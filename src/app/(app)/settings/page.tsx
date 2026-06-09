import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation("common");

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-txt mb-2">
          {t("settings.title")}
        </h1>
        <p className="text-muted">{t("settings.subtitle")}</p>
      </div>

      {/* Preferencias de Idioma */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language.title")}</CardTitle>
          <CardDescription>
            {t("settings.language.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              {t("settings.language.app_language")}
            </span>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>

      {/* Preferencias de Tema */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme.title")}</CardTitle>
          <CardDescription>{t("settings.theme.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              {t("settings.theme.visual_theme")}
            </span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Información de la App */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.about.title")}</CardTitle>
          <CardDescription>{t("settings.about.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              {t("settings.about.version")}
            </span>
            <span className="text-sm font-medium">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              {t("settings.about.developed_by")}
            </span>
            <span className="text-sm font-medium">CreatiFit Team</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              {t("settings.about.app_type")}
            </span>
            <span className="text-sm font-medium">
              {t("settings.about.mobile_native")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notifications.title")}</CardTitle>
          <CardDescription>
            {t("settings.notifications.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.notifications.workout_reminders")}
                </p>
                <p className="text-xs text-muted">
                  {t("settings.notifications.workout_reminders_desc")}
                </p>
              </div>
              <div className="w-12 h-6 bg-muted rounded-full relative">
                <div className="w-5 h-5 bg-primary rounded-full absolute left-0.5 top-0.5 transition-transform"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.notifications.achievements_progress")}
                </p>
                <p className="text-xs text-muted">
                  {t("settings.notifications.achievements_progress_desc")}
                </p>
              </div>
              <div className="w-12 h-6 bg-muted rounded-full relative">
                <div className="w-5 h-5 bg-primary rounded-full absolute left-0.5 top-0.5 transition-transform"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
