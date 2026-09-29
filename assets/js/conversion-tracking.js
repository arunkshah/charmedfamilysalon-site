/*
 * Charmed Family Salon Google Ads conversion tracking.
 * Tracks high-intent website actions that should teach Google Ads which clicks
 * turn into real enquiries: WhatsApp booking taps, phone link taps and booking
 * form submissions.
 */
(function () {
  if (window.__cfsConversionTrackingLoaded) return;
  window.__cfsConversionTrackingLoaded = true;

  var WHATSAPP_CONVERSION = "AW-17677272567/6BUGCLy-7MAcEPeLl-1B";
  var PHONE_CONVERSION = "AW-17677272567/4ufZCIujptIcEPeLl-1B";
  // "Booking form submission" (conversion type ID 7652187961) — Submit lead form,
  // Primary. Label read from Ads → Goals → the action → Tag setup → event snippet.
  var BOOKING_FORM_CONVERSION = "AW-17677272567/WQXYCLm-7MAcEPeLl-1B";
  var GOOGLE_TAG_ID = "AW-17677272567";
  var GA4_TAG_ID = "G-4WVWMB450P";

  function ensureGoogleTag() {
    window.dataLayer = window.dataLayer || [];

    if (typeof window.gtag !== "function") {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    } else {
      // The page's own inline stub already ran gtag('js') + both configs.
      // Re-running config would send a duplicate GA4 page_view per conversion.
      window.__cfsGoogleTagConfigured = true;
    }

    if (!window.__cfsGoogleTagConfigured) {
      window.__cfsGoogleTagConfigured = true;
      window.gtag("js", new Date());
      window.gtag("config", GA4_TAG_ID);
      window.gtag("config", GOOGLE_TAG_ID);
    }

    if (!window.__cfsGoogleTagScriptLoaded && !document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      window.__cfsGoogleTagScriptLoaded = true;
      var script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GOOGLE_TAG_ID);
      document.head.appendChild(script);
    }
  }

  function sendGoogleAdsConversion(sendTo, params) {
    ensureGoogleTag();

    var payload = Object.assign(
      {
        send_to: sendTo,
        value: 1.0,
        currency: "INR",
        // beacon survives the page navigating away to WhatsApp/dialler mid-send
        transport_type: "beacon"
      },
      params || {}
    );

    window.gtag("event", "conversion", payload);
  }

  function sendAnalyticsEvent(eventName, params) {
    ensureGoogleTag();
    window.gtag("event", eventName, Object.assign({ transport_type: "beacon" }, params || {}));
  }

  // Meta (Facebook) Pixel — mirror the same high-intent actions so Meta ads
  // can optimise on real enquiries and build a retargeting audience.
  function sendMetaLead(contactMethod, label) {
    if (typeof window.fbq !== "function") return;
    window.fbq("track", "Lead", {
      content_name: contactMethod,
      content_category: label || "",
      value: 1.0,
      currency: "INR"
    });
  }

  // Enhanced conversions (enabled account-side 2026-08-31, method "Google tag").
  // gtag SHA-256 hashes these in the browser before they leave the page — never
  // send them anywhere else. Phone must be E.164; the forms validate a 10-digit
  // Indian mobile, so +91 is the correct prefix. Automatic detection can't scrape
  // these forms reliably (they preventDefault and hide themselves on submit), so
  // set the values explicitly.
  function setEnhancedConversionData(info) {
    var userData = {};
    var phone = (info.phone || "").replace(/\D/g, "");
    if (/^[6-9]\d{9}$/.test(phone)) userData.phone_number = "+91" + phone;

    var email = (info.email || "").trim().toLowerCase();
    if (email.indexOf("@") > 0) userData.email = email;

    // Google requires at least one identifier; sending {} would be a no-op.
    if (!userData.phone_number && !userData.email) return;
    ensureGoogleTag();
    window.gtag("set", "user_data", userData);
  }

  // Booking/contact form submissions. Called by the form handlers themselves
  // (assets/js/booking-form.js and the inline handler on contact.html) rather
  // than from a listener here, because both forms preventDefault() and post to
  // Web3Forms in the background — there is no navigation or dataLayer consumer
  // (the GTM container was removed sitewide) that would otherwise fire this.
  var bookingFormConversionSent = false;
  window.cfsTrackBookingFormSubmission = function (details) {
    if (bookingFormConversionSent) return;
    bookingFormConversionSent = true;

    var info = details || {};
    var service = info.service || "";

    // Must precede the conversion event so the identifiers ride along with it.
    setEnhancedConversionData(info);

    sendGoogleAdsConversion(BOOKING_FORM_CONVERSION, {
      event_category: "lead",
      event_label: service || "Booking form"
    });
    sendAnalyticsEvent("booking_form_submission", {
      form_service: service,
      form_location: info.location || location.pathname
    });
    sendMetaLead("Booking form", service);
  };

  document.addEventListener(
    "click",
    function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;

      var rawHref = link.getAttribute("href") || "";
      var href = rawHref.toLowerCase();
      var label = (link.textContent || link.getAttribute("aria-label") || "").trim().slice(0, 120);

      if (href.indexOf("wa.me/") !== -1 || href.indexOf("api.whatsapp.com") !== -1 || href.indexOf("web.whatsapp.com") !== -1) {
        sendGoogleAdsConversion(WHATSAPP_CONVERSION, {
          event_category: "lead",
          event_label: label || "WhatsApp click"
        });
        sendAnalyticsEvent("whatsapp_click", {
          link_url: rawHref,
          link_text: label
        });
        sendMetaLead("WhatsApp", label);
        return;
      }

      if (href.indexOf("tel:") === 0) {
        sendGoogleAdsConversion(PHONE_CONVERSION, {
          event_category: "lead",
          event_label: label || "Phone click"
        });
        sendAnalyticsEvent("phone_click", {
          link_url: rawHref,
          link_text: label
        });
        sendMetaLead("Phone", label);
      }
    },
    true
  );
})();
