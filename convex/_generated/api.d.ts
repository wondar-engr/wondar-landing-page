/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons_bookings from "../crons/bookings.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as lib_admin_dashboard from "../lib/admin/dashboard.js";
import type * as lib_admin_profile from "../lib/admin/profile.js";
import type * as lib_admin_services from "../lib/admin/services.js";
import type * as lib_admin_systemConfig from "../lib/admin/systemConfig.js";
import type * as lib_admin_users from "../lib/admin/users.js";
import type * as lib_appActions_twilioActions from "../lib/appActions/twilioActions.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_emailActions from "../lib/emailActions.js";
import type * as lib_internalMuts_auth from "../lib/internalMuts/auth.js";
import type * as lib_internalMuts_stripe from "../lib/internalMuts/stripe.js";
import type * as lib_internalQueries_profiles from "../lib/internalQueries/profiles.js";
import type * as lib_internalQueries_settings from "../lib/internalQueries/settings.js";
import type * as lib_internalQueries_stripe from "../lib/internalQueries/stripe.js";
import type * as lib_notifications_index from "../lib/notifications/index.js";
import type * as lib_notifications_push from "../lib/notifications/push.js";
import type * as lib_stripe_connect from "../lib/stripe/connect.js";
import type * as lib_stripe_connectMutations from "../lib/stripe/connectMutations.js";
import type * as lib_stripe_connectQueries from "../lib/stripe/connectQueries.js";
import type * as lib_stripe_earnings from "../lib/stripe/earnings.js";
import type * as lib_stripe_index from "../lib/stripe/index.js";
import type * as lib_stripe_testing from "../lib/stripe/testing.js";
import type * as lib_user_client_bookingFns from "../lib/user/client/bookingFns.js";
import type * as lib_user_client_creativeFns from "../lib/user/client/creativeFns.js";
import type * as lib_user_client_profile from "../lib/user/client/profile.js";
import type * as lib_user_client_serviceFns from "../lib/user/client/serviceFns.js";
import type * as lib_user_core_notifications from "../lib/user/core/notifications.js";
import type * as lib_user_core_supports from "../lib/user/core/supports.js";
import type * as lib_user_creative_bookingFns from "../lib/user/creative/bookingFns.js";
import type * as lib_user_creative_dashboardFns from "../lib/user/creative/dashboardFns.js";
import type * as lib_user_creative_profile from "../lib/user/creative/profile.js";
import type * as lib_user_creative_service from "../lib/user/creative/service.js";
import type * as lib_user_profile from "../lib/user/profile.js";
import type * as lib_user_serviceCategories from "../lib/user/serviceCategories.js";
import type * as lib_user_userSettings from "../lib/user/userSettings.js";
import type * as lib_waitlist_core from "../lib/waitlist/core.js";
import type * as locations from "../locations.js";
import type * as r2 from "../r2.js";
import type * as seed_systemConfig from "../seed/systemConfig.js";
import type * as stripe_handlers_accountHandlers from "../stripe/handlers/accountHandlers.js";
import type * as stripe_handlers_index from "../stripe/handlers/index.js";
import type * as stripe_handlers_paymentHandlers from "../stripe/handlers/paymentHandlers.js";
import type * as stripe_handlers_payoutHandlers from "../stripe/handlers/payoutHandlers.js";
import type * as stripe_handlers_transferHandlers from "../stripe/handlers/transferHandlers.js";
import type * as stripe_index from "../stripe/index.js";
import type * as stripe_webhookHandler from "../stripe/webhookHandler.js";
import type * as stripe_webhooks from "../stripe/webhooks.js";
import type * as twilio from "../twilio.js";
import type * as unions from "../unions.js";
import type * as utils_emails_clientOnboardingEmail from "../utils/emails/clientOnboardingEmail.js";
import type * as utils_emails_components_BaseEmail from "../utils/emails/components/BaseEmail.js";
import type * as utils_emails_components_emailLayout from "../utils/emails/components/emailLayout.js";
import type * as utils_emails_creativeOnboardingEmail from "../utils/emails/creativeOnboardingEmail.js";
import type * as utils_emails_emailService from "../utils/emails/emailService.js";
import type * as utils_emails_magicLink from "../utils/emails/magicLink.js";
import type * as utils_emails_resetPassword from "../utils/emails/resetPassword.js";
import type * as utils_emails_sendEmail from "../utils/emails/sendEmail.js";
import type * as utils_emails_verifyEmail from "../utils/emails/verifyEmail.js";
import type * as utils_emails_verifyOTP from "../utils/emails/verifyOTP.js";
import type * as utils_emails_waitlistConfirmationEmail from "../utils/emails/waitlistConfirmationEmail.js";
import type * as utils_emails_welcomeEmail from "../utils/emails/welcomeEmail.js";
import type * as utils_errorUtils from "../utils/errorUtils.js";
import type * as utils_helpers from "../utils/helpers.js";
import type * as utils_helpers_profile from "../utils/helpers/profile.js";
import type * as utils_paymentConfig from "../utils/paymentConfig.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "crons/bookings": typeof crons_bookings;
  email: typeof email;
  http: typeof http;
  "lib/admin/dashboard": typeof lib_admin_dashboard;
  "lib/admin/profile": typeof lib_admin_profile;
  "lib/admin/services": typeof lib_admin_services;
  "lib/admin/systemConfig": typeof lib_admin_systemConfig;
  "lib/admin/users": typeof lib_admin_users;
  "lib/appActions/twilioActions": typeof lib_appActions_twilioActions;
  "lib/auth": typeof lib_auth;
  "lib/emailActions": typeof lib_emailActions;
  "lib/internalMuts/auth": typeof lib_internalMuts_auth;
  "lib/internalMuts/stripe": typeof lib_internalMuts_stripe;
  "lib/internalQueries/profiles": typeof lib_internalQueries_profiles;
  "lib/internalQueries/settings": typeof lib_internalQueries_settings;
  "lib/internalQueries/stripe": typeof lib_internalQueries_stripe;
  "lib/notifications/index": typeof lib_notifications_index;
  "lib/notifications/push": typeof lib_notifications_push;
  "lib/stripe/connect": typeof lib_stripe_connect;
  "lib/stripe/connectMutations": typeof lib_stripe_connectMutations;
  "lib/stripe/connectQueries": typeof lib_stripe_connectQueries;
  "lib/stripe/earnings": typeof lib_stripe_earnings;
  "lib/stripe/index": typeof lib_stripe_index;
  "lib/stripe/testing": typeof lib_stripe_testing;
  "lib/user/client/bookingFns": typeof lib_user_client_bookingFns;
  "lib/user/client/creativeFns": typeof lib_user_client_creativeFns;
  "lib/user/client/profile": typeof lib_user_client_profile;
  "lib/user/client/serviceFns": typeof lib_user_client_serviceFns;
  "lib/user/core/notifications": typeof lib_user_core_notifications;
  "lib/user/core/supports": typeof lib_user_core_supports;
  "lib/user/creative/bookingFns": typeof lib_user_creative_bookingFns;
  "lib/user/creative/dashboardFns": typeof lib_user_creative_dashboardFns;
  "lib/user/creative/profile": typeof lib_user_creative_profile;
  "lib/user/creative/service": typeof lib_user_creative_service;
  "lib/user/profile": typeof lib_user_profile;
  "lib/user/serviceCategories": typeof lib_user_serviceCategories;
  "lib/user/userSettings": typeof lib_user_userSettings;
  "lib/waitlist/core": typeof lib_waitlist_core;
  locations: typeof locations;
  r2: typeof r2;
  "seed/systemConfig": typeof seed_systemConfig;
  "stripe/handlers/accountHandlers": typeof stripe_handlers_accountHandlers;
  "stripe/handlers/index": typeof stripe_handlers_index;
  "stripe/handlers/paymentHandlers": typeof stripe_handlers_paymentHandlers;
  "stripe/handlers/payoutHandlers": typeof stripe_handlers_payoutHandlers;
  "stripe/handlers/transferHandlers": typeof stripe_handlers_transferHandlers;
  "stripe/index": typeof stripe_index;
  "stripe/webhookHandler": typeof stripe_webhookHandler;
  "stripe/webhooks": typeof stripe_webhooks;
  twilio: typeof twilio;
  unions: typeof unions;
  "utils/emails/clientOnboardingEmail": typeof utils_emails_clientOnboardingEmail;
  "utils/emails/components/BaseEmail": typeof utils_emails_components_BaseEmail;
  "utils/emails/components/emailLayout": typeof utils_emails_components_emailLayout;
  "utils/emails/creativeOnboardingEmail": typeof utils_emails_creativeOnboardingEmail;
  "utils/emails/emailService": typeof utils_emails_emailService;
  "utils/emails/magicLink": typeof utils_emails_magicLink;
  "utils/emails/resetPassword": typeof utils_emails_resetPassword;
  "utils/emails/sendEmail": typeof utils_emails_sendEmail;
  "utils/emails/verifyEmail": typeof utils_emails_verifyEmail;
  "utils/emails/verifyOTP": typeof utils_emails_verifyOTP;
  "utils/emails/waitlistConfirmationEmail": typeof utils_emails_waitlistConfirmationEmail;
  "utils/emails/welcomeEmail": typeof utils_emails_welcomeEmail;
  "utils/errorUtils": typeof utils_errorUtils;
  "utils/helpers": typeof utils_helpers;
  "utils/helpers/profile": typeof utils_helpers_profile;
  "utils/paymentConfig": typeof utils_paymentConfig;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
