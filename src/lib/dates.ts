import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const timeAgo = (date: Date | string) =>
  formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });

export const formatDate = (date: Date | string) =>
  format(new Date(date), "d MMMM yyyy", { locale: fr });

export const formatDateShort = (date: Date | string) =>
  format(new Date(date), "d MMM yyyy", { locale: fr });

export const formatMonthYear = (date: Date | string) =>
  format(new Date(date), "MMMM yyyy", { locale: fr });
