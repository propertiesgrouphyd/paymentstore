"use strict";


/* ============================================================
   VIDHWAAN PAYMENT STORE
   ============================================================

   Source of app catalog:
     ./apps.json

   Payment destination:
     https://payments.vidhwaan.com/

   IMPORTANT:
   - This page is only the app/subscription catalog.
   - The Worker remains the final authority for price,
     duration, app ID and app URL.
   - No customer information is collected here.
   - No Razorpay logic exists here.
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const APPS_URL =
  "./apps.json";

const PAYMENTS_URL =
  "https://payments.vidhwaan.com/";


/* ============================================================
   DOM
   ============================================================ */

const elements = {
  appsGrid:
    document.getElementById("apps-grid"),

  appCardTemplate:
    document.getElementById("app-card-template"),

  loadingState:
    document.getElementById("loading-state"),

  emptyState:
    document.getElementById("empty-state"),

  errorAlert:
    document.getElementById("error-alert"),

  errorMessage:
    document.getElementById("error-message"),

  appCount:
    document.getElementById("app-count")
};


/* ============================================================
   STATE
   ============================================================ */

let apps = [];


/* ============================================================
   HELPERS
   ============================================================ */

function text(
  value,
  fallback = ""
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value);
}


function numberValue(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function isValidUrl(
  value
) {
  try {
    const url =
      new URL(value);

    return (
      url.protocol === "https:" &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}


function formatPrice(
  amount
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  ).format(amount);
}


function show(
  element
) {
  if (element) {
    element.hidden = false;
  }
}


function hide(
  element
) {
  if (element) {
    element.hidden = true;
  }
}


/* ============================================================
   ERROR HANDLING
   ============================================================ */

function showError(
  message
) {
  if (elements.errorMessage) {
    elements.errorMessage.textContent =
      message;
  }

  show(
    elements.errorAlert
  );
}


function clearError() {
  hide(
    elements.errorAlert
  );

  if (elements.errorMessage) {
    elements.errorMessage.textContent =
      "";
  }
}


/* ============================================================
   APP VALIDATION
   ============================================================ */

function validateApp(
  app
) {
  if (
    !app ||
    typeof app !== "object"
  ) {
    return null;
  }


  const id =
    text(app.id).trim();

  const appId =
    text(app.appId)
      .trim()
      .toUpperCase();

  const name =
    text(app.name).trim();

  const url =
    text(app.url).trim();

  const amount =
    numberValue(app.amount);

  const days =
    numberValue(app.days);

  const active =
    app.active === true;


  /*
   * Invalid catalog entries are ignored.
   *
   * The browser does not become the payment authority.
   */
  if (!id) {
    return null;
  }

  if (!appId) {
    return null;
  }

  if (!name) {
    return null;
  }

  if (!isValidUrl(url)) {
    return null;
  }

  if (
    amount <= 0 ||
    days <= 0
  ) {
    return null;
  }


  return {
    id,
    appId,
    name,
    url,
    amount,
    days,
    active
  };
}


/* ============================================================
   LOAD APPS.JSON
   ============================================================ */

async function loadApps() {
  const response =
    await fetch(
      `${APPS_URL}?v=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        headers: {
          Accept: "application/json"
        }
      }
    );


  if (!response.ok) {
    throw new Error(
      `Unable to load the app catalogue (HTTP ${response.status}).`
    );
  }


  let data;

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      "The app catalogue contains invalid data."
    );
  }


  if (!Array.isArray(data)) {
    throw new Error(
      "The app catalogue format is invalid."
    );
  }


  const validatedApps =
    data
      .map(validateApp)
      .filter(Boolean);


  /*
   * Prevent duplicate app IDs from producing
   * multiple confusing cards.
   */
  const seenIds =
    new Set();

  const uniqueApps =
    validatedApps.filter(
      (app) => {
        const key =
          app.appId.toUpperCase();

        if (seenIds.has(key)) {
          return false;
        }

        seenIds.add(key);

        return true;
      }
    );


  return uniqueApps;
}


/* ============================================================
   APP ICON
   ============================================================ */

function createAppIcon(
  app
) {
  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "app-icon-wrap";


  const image =
    document.createElement(
      "img"
    );

  image.className =
    "app-icon";

  /*
   * Icons are intentionally generated from
   * the app URL rather than stored in apps.json.
   *
   * This keeps apps.json limited to payment-store
   * information.
   */
  image.alt =
    `${app.name} icon`;

  image.loading =
    "lazy";

  image.decoding =
    "async";


  /*
   * Known icon paths.
   *
   * If an icon is unavailable, the card remains
   * fully usable.
   */
  const iconUrls = {
    AIV:
      "https://aividhya.vidhwaan.com/icons/icon-512.png",

    NEET:
      "https://neet.vidhwaan.com/icons/logo.png",

    VAW:
      "https://writer.vidhwaan.com/assets/icons/icon-512.png",

    KID:
      "https://villagekidlab.vidhwaan.com/icons/logo2.png",

    BIL:
      "https://bill.vidhwaan.com/icons/icon-512.png",

    GIT:
      "https://gita.vidhwaan.com/icons/icon-512.png",

    SHOP:
      "https://market.vidhwaan.com/icons/icon-512.png"
  };


  const iconUrl =
    iconUrls[app.appId];


  if (iconUrl) {
    image.src =
      iconUrl;

    image.addEventListener(
      "error",
      () => {
        image.removeAttribute(
          "src"
        );

        image.alt =
          "";
      },
      {
        once: true
      }
    );
  } else {
    image.alt =
      "";
  }


  wrapper.appendChild(
    image
  );


  return wrapper;
}


/* ============================================================
   CREATE APP CARD
   ============================================================ */

function createAppCard(
  app
) {
  const template =
    elements.appCardTemplate;


  if (!template) {
    throw new Error(
      "App card template is missing."
    );
  }


  const fragment =
    template.content.cloneNode(
      true
    );


  const card =
    fragment.querySelector(
      ".app-card"
    );

  const iconContainer =
    fragment.querySelector(
      ".app-icon-wrap"
    );

  const status =
    fragment.querySelector(
      ".app-status"
    );

  const name =
    fragment.querySelector(
      ".app-name"
    );

  const description =
    fragment.querySelector(
      ".app-description"
    );

  const price =
    fragment.querySelector(
      ".app-price"
    );

  const days =
    fragment.querySelector(
      ".app-days"
    );

  const button =
    fragment.querySelector(
      ".pay-button"
    );

  const buttonText =
    fragment.querySelector(
      ".pay-button-text"
    );

  const viewAppButton =
    fragment.querySelector(
      ".view-app-button"
    );


  /*
   * App icon
   */
  if (iconContainer) {
    const generatedIcon =
      createAppIcon(app);

    iconContainer.replaceWith(
      generatedIcon
    );
  }


  /*
   * Basic display data
   */
  if (name) {
    name.textContent =
      app.name;
  }


  if (description) {
    description.textContent =
      "Subscription access";
  }


  if (price) {
    price.textContent =
      formatPrice(
        app.amount
      );
  }


  if (days) {
    days.textContent =
      `${app.days} days`;
  }


  /*
   * View App
   *
   * Opens the actual app in a new browser tab.
   */
  if (viewAppButton) {

    viewAppButton.href =
      app.url;

    viewAppButton.setAttribute(
      "aria-label",
      `Open ${app.name}`
    );

  }


  /*
   * Active / disabled state
   */
  if (app.active) {

    if (status) {
      status.textContent =
        "Available";
    }


    if (button) {
      button.disabled =
        false;

      button.setAttribute(
        "aria-label",
        `Pay ${formatPrice(app.amount)} for ${app.name}`
      );
    }


    if (buttonText) {
      buttonText.textContent =
        `Pay ${formatPrice(app.amount)}`;
    }


    if (button) {
      button.addEventListener(
        "click",
        () => {
          beginPayment(
            app,
            button
          );
        }
      );
    }

  } else {

    if (card) {
      card.classList.add(
        "is-disabled"
      );
    }


    if (status) {
      status.textContent =
        "Currently unavailable";
    }


    if (button) {
      button.disabled =
        true;

      button.setAttribute(
        "aria-disabled",
        "true"
      );

      button.setAttribute(
        "aria-label",
        `${app.name} is currently unavailable`
      );
    }


    if (buttonText) {
      buttonText.textContent =
        "Currently Unavailable";
    }

  }


  return fragment;
}


/* ============================================================
   PAYMENT HANDOFF
   ============================================================ */

function beginPayment(
  app,
  button
) {
  if (
    !app ||
    !app.active
  ) {
    return;
  }


  /*
   * Validate again immediately before
   * constructing the payment URL.
   */
  if (
    !isValidUrl(app.url)
  ) {
    showError(
      "This app has an invalid payment configuration."
    );

    return;
  }


  const params =
    new URLSearchParams();


  /*
   * These are only routing/catalog values.
   *
   * The payment Worker MUST independently
   * validate them against its trusted registry.
   */
  params.set(
    "appId",
    app.appId
  );

  params.set(
    "appUrl",
    app.url
  );

  params.set(
    "appName",
    app.name
  );

  params.set(
    "amount",
    String(app.amount)
  );

  params.set(
    "subscriptionDays",
    String(app.days)
  );


  /*
   * Prevent accidental double clicks.
   */
  if (button) {
    button.disabled =
      true;

    const originalText =
      button.querySelector(
        ".pay-button-text"
      );

    if (originalText) {
      originalText.textContent =
        "Opening checkout…";
    }
  }


  const destination =
    `${PAYMENTS_URL}?${params.toString()}`;


  /*
   * Normal top-level navigation is intentional.
   * The customer leaves Payment Store and enters
   * the dedicated secure payment site.
   */
  window.location.assign(
    destination
  );
}


/* ============================================================
   RENDER APPS
   ============================================================ */

function renderApps(
  appList
) {
  if (!elements.appsGrid) {
    throw new Error(
      "Apps grid is missing."
    );
  }


  elements.appsGrid.replaceChildren();


  /*
   * Active apps first.
   *
   * This means the currently purchasable
   * apps always appear before unavailable apps.
   */
  const sortedApps =
    [...appList].sort(
      (a, b) => {
        if (
          a.active !==
          b.active
        ) {
          return a.active
            ? -1
            : 1;
        }

        return a.name.localeCompare(
          b.name
        );
      }
    );


  const fragment =
    document.createDocumentFragment();


  for (
    const app of sortedApps
  ) {
    fragment.appendChild(
      createAppCard(app)
    );
  }


  elements.appsGrid.appendChild(
    fragment
  );


  /*
   * Count only active apps in the
   * visible availability indicator.
   */
  const activeCount =
    sortedApps.filter(
      (app) => app.active
    ).length;


  const totalCount =
    sortedApps.length;


  if (elements.appCount) {

    if (activeCount === 0) {

      elements.appCount.textContent =
        "No apps available";

    } else if (
      activeCount === 1
    ) {

      elements.appCount.textContent =
        "1 app available";

    } else {

      elements.appCount.textContent =
        `${activeCount} apps available`;

    }

  }


  hide(
    elements.loadingState
  );


  if (
    totalCount === 0
  ) {

    show(
      elements.emptyState
    );

  } else {

    hide(
      elements.emptyState
    );

  }


  elements.appsGrid.setAttribute(
    "aria-busy",
    "false"
  );
}


/* ============================================================
   INITIALIZE
   ============================================================ */

async function init() {
  clearError();


  show(
    elements.loadingState
  );


  hide(
    elements.emptyState
  );


  if (elements.appsGrid) {
    elements.appsGrid.replaceChildren();

    elements.appsGrid.setAttribute(
      "aria-busy",
      "true"
    );
  }


  try {

    apps =
      await loadApps();


    renderApps(
      apps
    );

  } catch (error) {

    console.error(
      "Payment Store error:",
      error
    );


    hide(
      elements.loadingState
    );


    if (elements.appsGrid) {
      elements.appsGrid.replaceChildren();

      elements.appsGrid.setAttribute(
        "aria-busy",
        "false"
      );
    }


    showError(
      error?.message ||
        "Unable to load the available apps. Please try again."
    );

  }
}


/* ============================================================
   START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init,
    {
      once: true
    }
  );

} else {

  init();

}
