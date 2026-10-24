// Publiczny klucz VAPID do powiadomień push. Przypomnienia wysyła cron Workera ogarnijmaterial.pl (src/przypomnienia.js),
// prywatny klucz jest tylko w jego sekrecie VAPID_PRYWATNY. Aktualny klucz przychodzi też z lingoza-dane/klucze.json (vapidPublic)
// i ma pierwszeństwo — wymiana kluczy nie wymaga zmiany kodu.
export const VAPID_PUBLICZNY = 'BFfJ8MJyXijfgB6vzCgSGjhoBgvL7UopuoESiwiOE3jYGccITy6Hg0fUDbIpwmCBNSoFH7fTpKxp2_t7rw_EJjk';
