const MOCK_CONFIG = {
    steps: [{
            key: "fenstertyp",
            type: "options",
            title: "Fenstertyp",
            subtitle: "Schritt 1 von max. 6",
            options: [{
                    value: "normal",
                    label: "Normales Fenster oder Tür",
                    description: "Für gerade Fenster ohne Neigung",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 25,
                    showSteps: ["befestigung", "masse" , "befestigung_test_1"]
                },
                {
                    value: "dachfenster",
                    label: "Dachfenster",
                    description: "Dachfenster mit Neigung",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 65,
                    showSteps: ["befestigung_test", "masse" , "befestigung_test_2"]
                }
            ]
        },

        {
            key: "befestigung",
            type: "options",
            title: "Befestigung",
            subtitle: "Schritt 2 von max. 6",
            options: [{
                    value: "schrauben",
                    label: "Schrauben",
                    description: "Feste Montage mit Schrauben",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 0
                },
                {
                    value: "klemmen",
                    label: "Klemmen",
                    description: "Montage ohne Bohren",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 10
                }
            ]
        },
        {
            key: "befestigung_test",
            type: "options",
            title: "Befestigung Test",
            subtitle: "Schritt 2 von max. 6",
            options: [{
                    value: "schrauben",
                    label: "Schrauben",
                    description: "Feste Montage mit Schrauben",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 10
                },
                {
                    value: "klemmen",
                    label: "Klemmen",
                    description: "Montage ohne Bohren",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 33
                }
            ]
        },

        {
            key: "masse",
            type: "measurement",
            title: "Maße",
            subtitle: "Schritt 3 von max. 6",
            description: "Bitte Maße laut Anleitung eingeben.",
            image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
            width: {
                min: 300,
                max: 1500
            },
            height: {
                min: 400,
                max: 1500
            }
        },
        {
            key: "befestigung_test_1",
            type: "options",
            title: "Befestigung Test 1",
            subtitle: "Schritt 2 von max. 6",
            options: [{
                    value: "schrauben",
                    label: "Schrauben",
                    description: "Feste Montage mit Schrauben",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 110
                },
                {
                    value: "klemmen",
                    label: "Klemmen",
                    description: "Montage ohne Bohren",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 303
                }
            ]
        },
        {
            key: "befestigung_test_2",
            type: "options",
            title: "Befestigung Test 2",
            subtitle: "Schritt 2 von max. 6",
            options: [{
                    value: "schrauben",
                    label: "Schrauben",
                    description: "Feste Montage mit Schrauben",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 100
                },
                {
                    value: "klemmen",
                    label: "Klemmen",
                    description: "Montage ohne Bohren",
                    image: "https://cdn.shopify.com/s/files/1/0697/0910/3332/files/option.png?v=1769085238",
                    price: 10
                }
            ]
        },
    ]
};


/* =====================================================
   STEP GENERATION
===================================================== */
function createStepShell(step, index) {
    return `
      <div class="config-step ${index !== 0 ? "is-disabled" : ""}"
           data-step="${index + 1}"
           data-step-key="${step.key}">
  
        <h2>${step.title}</h2>
        <p>${step.subtitle}</p>
  
        ${step.description ? `<div>${step.description}</div>` : ""}
        ${step.image ? `<div class="option-zoom"> <img src="${step.image}"> </div>` : ""}
  
        <div class="step-content"></div>
  
        <button class="step-next">WEITER</button>
      </div>
    `;
}

function renderDynamicSteps(config) {
    const wrapper = document.getElementById("dynamicSteps");
    wrapper.innerHTML = "";

    config.steps.forEach((step, index) => {
        wrapper.insertAdjacentHTML("beforeend", createStepShell(step, index));
    });

    renderStepContents(config);
}

function renderOptions(step, container) {
    step.options.forEach(opt => {
        container.insertAdjacentHTML("beforeend", `
        <label class="option-card">
          <div class="option-title">
            <input
              type="radio"
              name="${step.key}"
              value="${opt.value}"
            >
            <div class="option-title1">
            ${opt.label}
            <span class="option-price">
              (${opt.price > 0 ? "+" : ""}${opt.price} €)
            </span>
            </div>
            <img src="https://cdn.shopify.com/extensions/019bead9-e253-7ace-b99a-87365ef1f7bc/dev-f3cac707-85cf-466f-8b61-c189952e5121/assets/info.jpg" alt="Info" class="info_icon">
          </div>
  
          <div class="option-inner">
            <div class="option-text">
              <div class="option-description">${opt.description}
              </div>
            </div>
              <div class="option-image main-img">
             
              <div class="option-zoom">
  <img src="${opt.image}" alt="${opt.label}">
</div>

            </div>
          </div>
        </label>
      `);
    });
}


function renderStepContents(config) {
    config.steps.forEach((step, index) => {
        const stepEl = document.querySelector(
            `.config-step[data-step="${index + 1}"]`
        );
        const content = stepEl.querySelector(".step-content");

        if (step.type === "options") {
            renderOptions(step, content);
        }


        if (step.type === "measurement") {
            content.innerHTML = `
              <div class="measure-field">
                <label>Breite (${step.width.min} – ${step.width.max} mm)</label>
                <input
                  type="number"
                  name="breite"
                  placeholder="Breite in mm"
                  data-min="${step.width.min}"
                  data-max="${step.width.max}"
                >
                <div class="measure-error" data-error-for="breite"></div>
              </div>
          
              <div class="measure-field">
                <label>Höhe (${step.height.min} – ${step.height.max} mm)</label>
                <input
                  type="number"
                  name="hoehe"
                  placeholder="Höhe in mm"
                  data-min="${step.height.min}"
                  data-max="${step.height.max}"
                >
                <div class="measure-error" data-error-for="hoehe"></div>
              </div>
            `;
        }

    });
}

/* =====================================================
   MAIN INIT (ONLY ONE DOMContentLoaded)
===================================================== */
document.addEventListener("DOMContentLoaded", function() {

    let activeFlow = []; // 🔥 Current visible steps ka sequence
    let currentStepIndex = 0; // 🔥 Track current position in flow

    /* 1️⃣ Render steps */
    renderDynamicSteps(MOCK_CONFIG);
    buildSummaries(MOCK_CONFIG);


    /* 2️⃣ Cache steps AFTER render */
    const steps = document.querySelectorAll(".config-step");

    /* 3️⃣ State */
    const state = {
        selections: {},
        measurements: {},
        menge: 1
    };


    /* =====================================================
       🔥 CONDITIONAL FLOW HANDLER (MAIN LOGIC)
    ===================================================== */
    function handleDependencies(stepKey, selectedValue) {
        const step = MOCK_CONFIG.steps.find(s => s.key === stepKey);
        if (!step || !step.options) return;

        const option = step.options.find(o => o.value === selectedValue);
        if (!option || !option.showSteps) return;

        // 🔹 RESET: Previous selections clear karo (except current)
        Object.keys(state.selections).forEach(key => {
            if (key !== stepKey) {
                delete state.selections[key];
            }
        });
        state.measurements = {};

        // 🔹 NEW FLOW SET
        activeFlow = [stepKey, ...option.showSteps];
        currentStepIndex = 0;

        // 🔹 HIDE ALL STEPS (including final)
        document.querySelectorAll(".config-step").forEach(el => {
            el.classList.add("is-disabled");
        });
        const finalStep = document.getElementById("finalStep");
        if (finalStep) {
            finalStep.classList.add("is-disabled");
        }

        // 🔹 SHOW ONLY CURRENT STEP
        showStepByKey(stepKey);

        // 🔹 REBUILD SUMMARIES
        buildSummaries(MOCK_CONFIG);
        updateSummaryAlt();
        updatePrices();
    }


    function showStepByKey(key) {
        const el = document.querySelector(`.config-step[data-step-key="${key}"]`);
        if (el) {
            el.classList.remove("is-disabled");
        }
    }


    /* =====================================================
       STEP NAVIGATION
    ===================================================== */
    document.querySelectorAll(".step-next").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const currentStepEl = e.target.closest(".config-step");
            const currentKey = currentStepEl.dataset.stepKey;

            if (!isStepValid(currentStepEl)) {
                alert("Bitte Auswahl treffen");
                return;
            }

            // 🔹 Find next step in activeFlow
            const currentFlowIndex = activeFlow.indexOf(currentKey);
            
            // 🔥 CHECK: Agar last step of flow hai
            if (currentFlowIndex === -1 || currentFlowIndex === activeFlow.length - 1) {
                // 🔥 Show final step
                const finalStep = document.getElementById("finalStep");
                if (finalStep) {
                    renderFinalStep();
                    finalStep.classList.remove("is-disabled");
                    finalStep.scrollIntoView({
                        behavior: "smooth"
                    });
                }
                return;
            }

            // 🔹 Show NEXT step in flow
            const nextKey = activeFlow[currentFlowIndex + 1];
            showStepByKey(nextKey);

            const nextStepEl = document.querySelector(`.config-step[data-step-key="${nextKey}"]`);
            if (nextStepEl) {
                nextStepEl.scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    });

    /* =====================================================
       INPUT HANDLING
    ===================================================== */
    document.querySelectorAll("#configuratorSteps input").forEach(input => {
        input.addEventListener("input", () => {

            if (input.name === "breite" || input.name === "hoehe") {
                if (!validateMeasurementInput(input)) return;
            }

            saveState(input);

            // 🔥 DEPENDENCY CHECK (for radio)
            if (input.type === "radio") {
                handleDependencies(input.name, input.value);
            }

            updateSummaryAlt();
            updatePrices();
        });
    });



    /* =====================================================
       HELPERS
    ===================================================== */
    function saveState(input) {
        if (input.type === "radio") {
            state.selections[input.name] = input.value;
        }

        if (input.type === "number") {
            state.measurements[input.name] = Number(input.value);
        }
    }


    function calculateMeasurementPrice() {
        const {
            breite,
            hoehe
        } = state.measurements;
        if (!breite || !hoehe) return 0;

        const area = (breite * hoehe) / 1000000; // mm² → m²
        const pricePerSqM = 40; // example

        return area * pricePerSqM;
    }

    function calculateTotal() {
        let total = 0;

        // base product price (Shopify)
        total += window.BASE_PRICE || 0;

        // 🔥 OPTION PRICE (NEW)
        total += calculateOptionPrice();

        // 🔥 MEASUREMENT PRICE
        total += calculateMeasurementPrice();

        // quantity
        total *= state.menge;

        return Math.round(total * 100) / 100;
    }


    function calculateOptionPrice() {
        let total = 0;

        MOCK_CONFIG.steps.forEach(step => {
            if (step.type !== "options") return;

            const selectedValue = state.selections[step.key];
            if (!selectedValue) return;

            const opt = step.options.find(o => o.value === selectedValue);
            if (opt) {
                total += opt.price;
            }
        });

        return total;
    }


    function updatePrices() {
        const subtotalEl = document.querySelector(".summary-price b");
        const totalEl = document.querySelector(".total b");

        const total = calculateTotal();

        if (subtotalEl) subtotalEl.textContent = `${total.toFixed(2)} €`;
        if (totalEl) totalEl.textContent = `${total.toFixed(2)} €`;
    }

    function isStepValid(step) {
        const radios = step.querySelectorAll('input[type="radio"]');
        const numbers = step.querySelectorAll('input[type="number"]');

        // ✅ OPTION STEP (radio)
        if (radios.length) {
            return [...radios].some(radio => radio.checked);
        }

        // ✅ MEASUREMENT STEP (number)
        if (numbers.length) {
            return [...numbers].every(input => {
                if (!input.value) return false;
                return validateMeasurementInput(input);
            });
        }

        return true;
    }



    function renderFinalStep() {
        document.querySelectorAll("[data-final]").forEach(el => {
            const key = el.dataset.final;
            let value = "—";

            if (key === "masse") {
                const {
                    breite,
                    hoehe
                } = state.measurements || {};
                if (breite && hoehe) {
                    value = `${breite} mm × ${hoehe} mm`;
                }
            } else {
                const selected = state.selections?.[key];
                if (selected) {
                    // 🔥 Show label instead of value
                    const step = MOCK_CONFIG.steps.find(s => s.key === key);
                    if (step && step.options) {
                        const opt = step.options.find(o => o.value === selected);
                        value = opt ? opt.label : selected;
                    } else {
                        value = selected;
                    }
                }
            }

            el.textContent = value;
        });
    }



    function updateSummaryAlt() {
        document.querySelectorAll("[data-summary-alt]").forEach(el => {
            const key = el.dataset.summaryAlt;
            let value = "—";

            // ✅ ONLY for measurement row
            if (key === "masse") {
                const {
                    breite,
                    hoehe
                } = state.measurements || {};
                if (breite && hoehe) {
                    value = `${breite} mm × ${hoehe} mm`;
                }
            }
            // ✅ ONLY for option selections
            else {
                const selected = state.selections?.[key];
                if (selected) {
                    // 🔥 Show label instead of value
                    const step = MOCK_CONFIG.steps.find(s => s.key === key);
                    if (step && step.options) {
                        const opt = step.options.find(o => o.value === selected);
                        value = opt ? opt.label : selected;
                    } else {
                        value = selected;
                    }
                }
            }

            el.textContent = value;
        });
    }



    document.querySelector(".qty-plus")?.addEventListener("click", () => {
        state.menge++;
        document.querySelector(".qty-value").textContent = state.menge;
        updateSummaryAlt();
        updatePrices();
    });

    document.querySelector(".qty-minus")?.addEventListener("click", () => {
        if (state.menge > 1) {
            state.menge--;
            document.querySelector(".qty-value").textContent = state.menge;
            updateSummaryAlt();
            updatePrices();
        }
    });


    function mmToCm(mm) {
        return mm / 10;
    }

    function validateMeasurementInput(input) {
        const min = Number(input.dataset.min);
        const max = Number(input.dataset.max);
        const value = Number(input.value);

        const errorEl = document.querySelector(
            `.measure-error[data-error-for="${input.name}"]`
        );

        input.classList.remove("error");
        errorEl.style.display = "none";
        errorEl.textContent = "";

        if (!value) return true;

        if (value < min || value > max) {
            input.classList.add("error");

            errorEl.textContent =
                `Du hast ${value} mm (= ${mmToCm(value)} cm) eingegeben. ` +
                `Die ${input.name === "breite" ? "Breite" : "Höhe"} muss zwischen ` +
                `${min} und ${max} mm liegen (= ${mmToCm(min)}–${mmToCm(max)} cm).`;

            errorEl.style.display = "block";
            return false;
        }

        return true;
    }

    // Zoom effect on options image  
    document.addEventListener("mousemove", function(e) {
        const zoomBox = e.target.closest(".option-zoom");
        if (!zoomBox) return;

        const img = zoomBox.querySelector("img");
        const rect = zoomBox.getBoundingClientRect();

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        img.style.transformOrigin = `${x}% ${y}%`;
        img.style.transform = "scale(2)";
    });

    document.addEventListener("mouseleave", function(e) {
        const zoomBox = e.target.closest(".option-zoom");
        if (!zoomBox) return;

        const img = zoomBox.querySelector("img");
        img.style.transform = "scale(1)";
        img.style.transformOrigin = "center center";
    }, true);
    //   zoom effect code ends here


    function buildSummaries(config) {
        const finalTable = document.getElementById("finalSummary");
        const sideList = document.getElementById("summaryBoxAltList");

        if (!finalTable || !sideList) return;

        finalTable.innerHTML = "";
        sideList.innerHTML = "";

        config.steps.forEach(step => {

            // 🔴 Skip steps jo current flow me nahi hain
            if (
                activeFlow.length &&
                !activeFlow.includes(step.key)
            ) {
                return;
            }

            // 🔹 Measurement special case
            if (step.type === "measurement") {
                finalTable.insertAdjacentHTML("beforeend", `
              <tr>
                <td>${step.title}</td>
                <td data-final="masse">—</td>
              </tr>
            `);

                sideList.insertAdjacentHTML("beforeend", `
              <li>
                <strong>${step.title}:</strong>
                <span data-summary-alt="masse">—</span>
              </li>
            `);

                return;
            }

            // 🔹 Normal options
            finalTable.insertAdjacentHTML("beforeend", `
            <tr>
              <td>${step.title}</td>
              <td data-final="${step.key}">—</td>
            </tr>
          `);

            sideList.insertAdjacentHTML("beforeend", `
            <li>
              <strong>${step.title}:</strong>
              <span data-summary-alt="${step.key}">—</span>
            </li>
          `);
        });
    }
});


document.querySelector(".zoom-thumb")?.addEventListener("mousemove", (e) => {
    const preview = document.querySelector(".zoom-preview");

    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    preview.style.backgroundPosition = `${x}% ${y}%`;
});