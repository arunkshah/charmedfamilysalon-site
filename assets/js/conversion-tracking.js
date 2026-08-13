/*
 * Charmed Family Salon Google Ads conversion tracking.
 * Tracks high-intent website actions that should teach Google Ads which clicks
 * turn into real enquiries: WhatsApp booking taps and phone link taps.
 */
(function () {
  if (window.__cfsConversionTrackingLoaded) return;
  window.__cfsConversionTrackingLoaded = true;

  var WHATSAPP_CONVERSION = "AW-17677272567/6BUGCLy-7MAcEPeLl-1B";
  var PHONE_CONVERSION = "AW-17677272567/4ufZCIujptIcEPeLl-1B";

  function sendGoogleAdsConversion(sendTo, params) {
    if (typeof window.gtag !== "function") return;

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
    if (typeof window.gtag !== "function") return;
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
