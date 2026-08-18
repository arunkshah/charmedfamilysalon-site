/*
 * Charmed Family Salon — inline booking form for service landing pages.
 * Submits to Web3Forms, mirrors the contact-page conversion tracking
 * (dataLayer "appointment_form_submission"), and ALWAYS falls back to
 * opening WhatsApp with the details prefilled so a lead is never lost
 * even if the form backend fails.
 */
(function () {
  var WEB3FORMS_KEY = "fc2fbb31-f515-4b00-88eb-96cfa85b8f3a";
  var PHONE = "918981965553";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var forms = document.querySelectorAll("form.js-booking-form");
    Array.prototype.forEach.call(forms, function (form) {
      // Block past dates on the optional date picker.
      var dateEl = form.querySelector("[name=date]");
      if (dateEl && !dateEl.min) {
        try { dateEl.min = new Date().toISOString().split("T")[0]; } catch (e) {}
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var nameEl = form.querySelector("[name=name]");
        var phoneEl = form.querySelector("[name=phone]");
        var errEl = form.querySelector(".jbf-error");
        var name = (nameEl && nameEl.value || "").trim();
        var phone = (phoneEl && phoneEl.value || "").trim().replace(/\s/g, "");
        var service = form.getAttribute("data-service") || "";
        var date = (form.querySelector("[name=date]") || {}).value || "";

        function showErr(m) {
          if (errEl) { errEl.textContent = m; errEl.style.display = "block"; }
        }
        if (errEl) errEl.style.display = "none";
        if (!name) { showErr("Please enter your name."); if (nameEl) nameEl.focus(); return; }
        if (!/^[6-9]\d{9}$/.test(phone)) {
          showErr("Enter a valid 10-digit mobile number.");
          if (phoneEl) phoneEl.focus();
          return;
        }

        var btn = form.querySelector("button[type=submit]");
        if (btn) { btn.dataset.label = btn.innerHTML; btn.textContent = "Sending…"; btn.disabled = true; }

        var fd = new FormData();
        fd.append("access_key", WEB3FORMS_KEY);
        fd.append("subject", "New Booking Enquiry – Charmed Family Salon");
        fd.append("from_name", "Charmed Salon Website");
        fd.append("name", name);
        fd.append("phone", phone);
        if (service) fd.append("service", service);
        if (date) fd.append("date", date);
        fd.append("page", location.pathname);

        function finish() {
          var wrap = form.closest(".jbf-wrap") || form.parentNode;
          var ok = wrap.querySelector(".jbf-success");
          form.style.display = "none";
          if (ok) ok.style.display = "block";

          // Mirror the contact form's tracking event.
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "appointment_form_submission", form_service: service });

          // WhatsApp fallback — always deliver the lead to the salon.
          var msg = "Hi%2C%20I%20just%20requested%20a%20booking%20on%20your%20website.";
          msg += "%0AName%3A%20" + encodeURIComponent(name);
          msg += "%0APhone%3A%20" + encodeURIComponent(phone);
          if (service) msg += "%0AService%3A%20" + encodeURIComponent(service);
          if (date) msg += "%0APreferred%20date%3A%20" + encodeURIComponent(date);
          setTimeout(function () {
            window.open("https://wa.me/" + PHONE + "?text=" + msg, "_blank");
          }, 700);
        }

        fetch("https://api.web3forms.com/submit", { method: "POST", body: fd })
          .then(function (r) { return r.json(); })
          .then(function () { finish(); })
          .catch(function () { finish(); });
      });
    });
  });
})();
