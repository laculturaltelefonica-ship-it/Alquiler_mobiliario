
/* ============================================================
   ALQUILER DE MATERIAL
   CATERING GIL & ROMÁN
   Archivo: script.js

   Funciones:
   1. Navegación principal.
   2. Menú móvil.
   3. Navegación por categorías.
   4. Gestión del catálogo.
   5. Selección de productos.
   6. Carrito de presupuesto.
   7. Persistencia de selección.
   8. Formulario de solicitud.
   9. Integración con WhatsApp.
   10. Control de imágenes.
   11. Accesibilidad.
   12. Actualización del footer.

   Compatible con:
   index.html + style.css

   No requiere librerías externas.
============================================================ */


"use strict";


/* ============================================================
   1. CONFIGURACIÓN GENERAL
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const CONFIG = {

        whatsapp: "34643213578",

        storageKey: "cgr_alquiler_material_presupuesto",

        cateringUrl:
            "https://laculturaltelefonica-ship-it.github.io/CateringGilRoman/",

        animationDuration: 300,

        maxQuantity: 10000,

        currency: "EUR",

        locale: "es-ES"

    };


    /* ========================================================
       2. REFERENCIAS GENERALES DEL DOM
    ======================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        Array.from(parent.querySelectorAll(selector));


    const elements = {

        body: document.body,

        header: $(".header"),

        mobileMenuButton: $("#mobileMenuButton"),

        mobileNavigation: $("#mobileNavigation"),

        mainNavigation: $(".main-navigation"),

        catalogNavigation: $(".catalog-navigation"),

        catalogNavItems: $$(".catalog-nav-item"),

        productCards: $$(".product-card"),

        productButtons: $$("[data-add-to-cart]"),

        quantityInputs: $$(".product-quantity"),

        cartCounter: $("#cart-counter"),

        cartItems: $("#cart-items"),

        cartTotal: $("#cart-total"),

        clearBudgetButton: $("#clearBudget"),

        quoteNote: $("#quote-note"),

        customerName: $("#customerName"),

        eventDate: $("#eventDate"),

        eventLocation: $("#eventLocation"),

        eventPeople: $("#eventPeople"),

        customerComments: $("#customerComments"),

        privacyAccept: $("#privacy-accept"),

        sendBudgetButton: $("#sendBudgetWhatsApp"),

        currentYear: $("#currentYear")

    };


    /* ========================================================
       3. ESTADO DE LA APLICACIÓN
    ======================================================== */

    /*
       La selección se almacena mediante identificadores.

       Ejemplo:

       {
           "mesa-roja": 4,
           "silla-verde-alta": 30,
           "vaso-clasico": 50
       }

       Los números representan cantidades.

       Los precios no se inventan ni se almacenan.
    */

    const cart = new Map();


    let toastTimeout = null;

    let activeCategory = null;

    let isMobileMenuOpen = false;


    /* ========================================================
       4. FUNCIONES AUXILIARES
    ======================================================== */


    /**
     * Comprueba que un elemento exista.
     */

    function exists(element) {

        return element instanceof HTMLElement;

    }


    /**
     * Convierte un valor en una cantidad válida.
     */

    function normalizeQuantity(value) {

        const quantity = Number.parseInt(value, 10);

        if (!Number.isFinite(quantity)) {
            return 0;
        }

        return Math.min(
            CONFIG.maxQuantity,
            Math.max(0, quantity)
        );

    }


    /**
     * Formatea una cantidad.
     */

    function formatQuantity(value) {

        return new Intl.NumberFormat(CONFIG.locale)
            .format(value);

    }


    /**
     * Obtiene el precio unitario de una tarjeta.

     * El HTML actual tiene los atributos de precio vacíos.
     * Solo se considerará un precio si posteriormente
     * se introduce un valor numérico válido.
     */

    function getUnitPrice(card) {

        if (!card) {
            return null;
        }

        const rawPrice =
            card.dataset.unitPrice ||
            card.dataset.price;

        if (
            rawPrice === undefined ||
            rawPrice === null ||
            rawPrice.trim() === ""
        ) {
            return null;
        }

        const price = Number(
            rawPrice.replace(",", ".")
        );

        if (!Number.isFinite(price) || price < 0) {
            return null;
        }

        return price;

    }


    /**
     * Formatea importes monetarios.
     */

    function formatCurrency(value) {

        return new Intl.NumberFormat(
            CONFIG.locale,
            {
                style: "currency",
                currency: CONFIG.currency
            }
        ).format(value);

    }


    /**
     * Obtiene la tarjeta de un producto.
     */

    function getProductCard(productId) {

        return elements.productCards.find(card =>
            card.dataset.productId === productId
        ) || null;

    }


    /**
     * Obtiene los datos de un producto.
     */

    function getProductData(productId) {

        const card = getProductCard(productId);

        if (!card) {
            return null;
        }

        return {

            id: productId,

            name:
                card.dataset.productName ||
                $(".product-name", card)?.textContent.trim() ||
                "Producto",

            category:
                card.dataset.productCategory ||
                "Material",

            price: getUnitPrice(card),

            card: card

        };

    }


    /**
     * Comprueba si existe al menos un producto.
     */

    function hasProducts() {

        return cart.size > 0;

    }


    /**
     * Calcula el número total de unidades.
     */

    function getTotalUnits() {

        let total = 0;

        cart.forEach(quantity => {

            total += quantity;

        });

        return total;

    }


    /**
     * Crea un elemento HTML sin insertar texto
     * del usuario mediante innerHTML.
     */

    function createElement(tag, className, text) {

        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;

    }


    /* ========================================================
       5. SISTEMA DE NOTIFICACIONES
    ======================================================== */

    /*
       Las notificaciones se crean dinámicamente.

       El CSS posterior podrá controlar su apariencia
       mediante la clase .site-toast.
    */

    const toast = createElement(
        "div",
        "site-toast"
    );

    toast.setAttribute("role", "status");

    toast.setAttribute("aria-live", "polite");

    toast.setAttribute("aria-atomic", "true");

    toast.hidden = true;

    document.body.appendChild(toast);


    function showToast(message, type = "success") {

        if (toastTimeout) {

            clearTimeout(toastTimeout);

        }

        toast.textContent = message;

        toast.dataset.type = type;

        toast.hidden = false;

        requestAnimationFrame(() => {

            toast.classList.add("is-visible");

        });

        toastTimeout = setTimeout(() => {

            toast.classList.remove("is-visible");

            setTimeout(() => {

                toast.hidden = true;

            }, CONFIG.animationDuration);

        }, 3000);

    }


    /* ========================================================
       6. NAVEGACIÓN Y DESPLAZAMIENTO SUAVE
    ======================================================== */


    /**
     * Calcula la altura superior necesaria para
     * evitar que los encabezados queden ocultos.
     */

    function getScrollOffset() {

        let offset = 15;

        if (exists(elements.header)) {

            offset += elements.header.offsetHeight;

        }

        if (exists(elements.catalogNavigation)) {

            const style = getComputedStyle(
                elements.catalogNavigation
            );

            if (style.position === "fixed" ||
                style.position === "sticky") {

                offset +=
                    elements.catalogNavigation.offsetHeight;

            }

        }

        return offset;

    }


    /**
     * Desplaza la página hasta una sección.
     */

    function scrollToElement(target) {

        if (!target) {
            return;
        }

        const top =
            target.getBoundingClientRect().top +
            window.scrollY -
            getScrollOffset();

        const reducedMotion =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

        window.scrollTo({

            top: Math.max(0, top),

            behavior: reducedMotion ? "auto" : "smooth"

        });

    }


    /**
     * Gestiona enlaces internos.
     */

    function initializeSmoothNavigation() {

        const internalLinks = $$('a[href^="#"]');

        internalLinks.forEach(link => {

            link.addEventListener("click", event => {

                const href = link.getAttribute("href");

                if (!href || href === "#") {
                    return;
                }

                let target;

                try {

                    target = document.querySelector(href);

                } catch (error) {

                    return;

                }

                if (!target) {
                    return;
                }

                event.preventDefault();

                closeMobileMenu();

                scrollToElement(target);

                /*
                   Actualizamos la URL sin provocar
                   un salto brusco del navegador.
                */

                if (history.replaceState) {

                    history.replaceState(
                        null,
                        "",
                        href
                    );

                }

            });

        });

    }


    /* ========================================================
       7. MENÚ MÓVIL
    ======================================================== */


    /**
     * Abre el menú móvil.
     */

    function openMobileMenu() {

        if (!exists(elements.mobileNavigation)) {
            return;
        }

        isMobileMenuOpen = true;

        elements.mobileNavigation.classList.add(
            "is-open",
            "active"
        );

        elements.body.classList.add("menu-open");

        if (exists(elements.mobileMenuButton)) {

            elements.mobileMenuButton.classList.add(
                "is-active"
            );

            elements.mobileMenuButton.setAttribute(
                "aria-expanded",
                "true"
            );

            elements.mobileMenuButton.setAttribute(
                "aria-label",
                "Cerrar menú"
            );

        }

    }


    /**
     * Cierra el menú móvil.
     */

    function closeMobileMenu() {

        if (!exists(elements.mobileNavigation)) {
            return;
        }

        isMobileMenuOpen = false;

        elements.mobileNavigation.classList.remove(
            "is-open",
            "active"
        );

        elements.body.classList.remove("menu-open");

        if (exists(elements.mobileMenuButton)) {

            elements.mobileMenuButton.classList.remove(
                "is-active"
            );

            elements.mobileMenuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            elements.mobileMenuButton.setAttribute(
                "aria-label",
                "Abrir menú"
            );

        }

    }


    /**
     * Alterna el menú.
     */

    function toggleMobileMenu() {

        if (isMobileMenuOpen) {

            closeMobileMenu();

        } else {

            openMobileMenu();

        }

    }


    function initializeMobileMenu() {

        if (!exists(elements.mobileMenuButton)) {
            return;
        }

        elements.mobileMenuButton.addEventListener(
            "click",
            toggleMobileMenu
        );

        /*
           Cerrar cuando se pulsa un enlace.
        */

        if (exists(elements.mobileNavigation)) {

            $$("a", elements.mobileNavigation)
                .forEach(link => {

                    link.addEventListener(
                        "click",
                        closeMobileMenu
                    );

                });

        }

        /*
           Cerrar al pulsar fuera del menú.
        */

        document.addEventListener("click", event => {

            if (!isMobileMenuOpen) {
                return;
            }

            const clickedInsideMenu =
                elements.mobileNavigation.contains(
                    event.target
                );

            const clickedButton =
                elements.mobileMenuButton.contains(
                    event.target
                );

            if (!clickedInsideMenu && !clickedButton) {

                closeMobileMenu();

            }

        });

        /*
           Cerrar al cambiar a pantalla grande.
        */

        window.addEventListener("resize", () => {

            if (window.innerWidth > 900) {

                closeMobileMenu();

            }

        });

    }


    /* ========================================================
       8. CABECERA AL HACER SCROLL
    ======================================================== */

    function updateHeaderOnScroll() {

        if (!exists(elements.header)) {
            return;
        }

        const scrolled = window.scrollY > 40;

        elements.header.classList.toggle(
            "is-scrolled",
            scrolled
        );

        elements.header.classList.toggle(
            "scrolled",
            scrolled
        );

    }


    function initializeHeaderScroll() {

        updateHeaderOnScroll();

        let ticking = false;

        window.addEventListener(
            "scroll",
            () => {

                if (ticking) {
                    return;
                }

                ticking = true;

                requestAnimationFrame(() => {

                    updateHeaderOnScroll();

                    ticking = false;

                });

            },
            { passive: true }
        );

    }


    /* ========================================================
       9. NAVEGACIÓN ACTIVA DEL CATÁLOGO
    ======================================================== */


    /**
     * Activa visualmente una categoría.
     */

    function setActiveCategory(categoryId) {

        activeCategory = categoryId;

        elements.catalogNavItems.forEach(link => {

            const href = link.getAttribute("href");

            const isActive = href === `#${categoryId}`;

            link.classList.toggle(
                "active",
                isActive
            );

            if (isActive) {

                link.setAttribute(
                    "aria-current",
                    "location"
                );

            } else {

                link.removeAttribute("aria-current");

            }

        });

    }


    /**
     * Observa las categorías visibles.
     */

    function initializeCategoryObserver() {

        const categoryIds = [
            "mesas",
            "sillas",
            "platos",
            "cubiertos"
        ];

        const categories = categoryIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

        if (!categories.length) {
            return;
        }

        /*
           La categoría de vasos tiene su propio
           identificador dentro de la sección platos.

           Por eso también la observamos.
        */

        const vasosSection = $("#vasos");

        if (vasosSection) {

            categories.push(vasosSection);

        }

        if (!("IntersectionObserver" in window)) {
            return;
        }

        const observer = new IntersectionObserver(

            entries => {

                const visible = entries
                    .filter(entry => entry.isIntersecting)
                    .sort((a, b) => {

                        return (
                            b.intersectionRatio -
                            a.intersectionRatio
                        );

                    });

                if (!visible.length) {
                    return;
                }

                let id = visible[0].target.id;

                /*
                   El identificador vasos pertenece
                   a la subcategoría de cristalería.
                */

                if (id === "vasos") {

                    id = "platos";

                }

                setActiveCategory(id);

            },

            {

                root: null,

                rootMargin: "-20% 0px -55% 0px",

                threshold: [0, 0.15, 0.3, 0.5, 0.7]

            }

        );

        categories.forEach(category => {

            observer.observe(category);

        });

    }


    /* ========================================================
       10. IDENTIFICACIÓN DEL CATÁLOGO
    ======================================================== */


    /**
     * Comprueba la integridad de los productos.
     */

    function validateCatalog() {

        const seenIds = new Set();

        elements.productCards.forEach(card => {

            const id = card.dataset.productId;

            const name = card.dataset.productName;

            if (!id || !name) {

                console.warn(
                    "Tarjeta sin identificador o nombre:",
                    card
                );

                return;

            }

            if (seenIds.has(id)) {

                console.warn(
                    `Identificador de producto duplicado: ${id}`
                );

            }

            seenIds.add(id);

            /*
               Comprobamos que exista un campo de cantidad.
            */

            const quantityInput = $(
                `.product-quantity`,
                card
            );

            if (!quantityInput) {

                console.warn(
                    `Falta el campo de cantidad en ${id}`
                );

            }

        });

        console.info(
            `Catálogo inicializado: ${seenIds.size} productos.`
        );

    }


    /* ========================================================
       11. CONTROL DE CANTIDADES
    ======================================================== */


    /**
     * Normaliza los campos de cantidad.
     */

    function initializeQuantityInputs() {

        elements.quantityInputs.forEach(input => {

            input.min = "0";

            input.max = String(CONFIG.maxQuantity);

            input.step = "1";

            input.addEventListener("change", () => {

                const value = normalizeQuantity(
                    input.value
                );

                input.value = String(value);

            });

            input.addEventListener("input", () => {

                if (input.value === "") {
                    return;
                }

                const value = normalizeQuantity(
                    input.value
                );

                if (Number(input.value) < 0) {

                    input.value = "0";

                } else if (
                    Number(input.value) > CONFIG.maxQuantity
                ) {

                    input.value = String(
                        CONFIG.maxQuantity
                    );

                }

            });

        });

    }


    /* ========================================================
       12. PERSISTENCIA DEL PRESUPUESTO
    ======================================================== */


    /**
     * Guarda únicamente la selección de productos.
     *
     * No guarda nombre, teléfono, fecha ni otros
     * datos personales del visitante.
     */

    function saveCart() {

        try {

            const data = Object.fromEntries(cart);

            localStorage.setItem(
                CONFIG.storageKey,
                JSON.stringify(data)
            );

        } catch (error) {

            console.warn(
                "No se pudo guardar la selección:",
                error
            );

        }

    }


    /**
     * Recupera la selección guardada.
     */

    function loadCart() {

        try {

            const saved = localStorage.getItem(
                CONFIG.storageKey
            );

            if (!saved) {
                return;
            }

            const data = JSON.parse(saved);

            if (
                !data ||
                typeof data !== "object" ||
                Array.isArray(data)
            ) {

                return;

            }

            Object.entries(data).forEach(
                ([productId, quantity]) => {

                    const product = getProductData(productId);

                    const validQuantity =
                        normalizeQuantity(quantity);

                    if (
                        product &&
                        validQuantity > 0
                    ) {

                        cart.set(
                            productId,
                            validQuantity
                        );

                    }

                }
            );

        } catch (error) {

            console.warn(
                "No se pudo recuperar el presupuesto:",
                error
            );

            cart.clear();

        }

    }


    /* ========================================================
       13. AÑADIR PRODUCTOS
    ======================================================== */


    /**
     * Añade una cantidad de un producto.
     */

    function addProduct(productId) {

        const product = getProductData(productId);

        if (!product) {

            showToast(
                "No se ha podido identificar el producto.",
                "error"
            );

            return;

        }

        const quantityInput = $(
            ".product-quantity",
            product.card
        );

        if (!quantityInput) {

            showToast(
                "No se encuentra el campo de cantidad.",
                "error"
            );

            return;

        }

        const requestedQuantity =
            normalizeQuantity(quantityInput.value);

        if (requestedQuantity <= 0) {

            showToast(
                "Indica una cantidad mayor que cero.",
                "warning"
            );

            quantityInput.focus();

            return;

        }

        const previousQuantity =
            cart.get(productId) || 0;

        const newQuantity = Math.min(
            CONFIG.maxQuantity,
            previousQuantity + requestedQuantity
        );

        cart.set(productId, newQuantity);

        /*
           Reiniciamos el campo de la tarjeta.
        */

        quantityInput.value = "0";

        saveCart();

        renderCart();

        showToast(
            `${product.name}: ${formatQuantity(requestedQuantity)} unidades añadidas.`,
            "success"
        );

    }


    /**
     * Inicializa todos los botones Añadir.
     */

    function initializeAddButtons() {

        elements.productButtons.forEach(button => {

            button.addEventListener("click", () => {

                const productId =
                    button.dataset.addToCart;

                if (!productId) {
                    return;
                }

                addProduct(productId);

            });

        });

    }


    /* ========================================================
       14. MODIFICAR CANTIDADES DESDE EL PRESUPUESTO
    ======================================================== */


    /**
     * Cambia la cantidad de un producto.
     */

    function updateCartQuantity(productId, difference) {

        if (!cart.has(productId)) {
            return;
        }

        const currentQuantity = cart.get(productId);

        const newQuantity = normalizeQuantity(
            currentQuantity + difference
        );

        if (newQuantity <= 0) {

            cart.delete(productId);

        } else {

            cart.set(productId, newQuantity);

        }

        saveCart();

        renderCart();

    }


    /**
     * Elimina un producto.
     */

    function removeProduct(productId) {

        if (!cart.has(productId)) {
            return;
        }

        const product = getProductData(productId);

        cart.delete(productId);

        saveCart();

        renderCart();

        showToast(
            `${product?.name || "Producto"} eliminado de la selección.`,
            "info"
        );

    }


    /**
     * Vacía todo el presupuesto.
     */

    function clearCart() {

        if (!hasProducts()) {

            showToast(
                "La selección ya está vacía.",
                "info"
            );

            return;

        }

        const confirmed = window.confirm(
            "¿Quieres eliminar todos los productos de tu selección?"
        );

        if (!confirmed) {
            return;
        }

        cart.clear();

        saveCart();

        renderCart();

        elements.quantityInputs.forEach(input => {

            input.value = "0";

        });

        showToast(
            "Se ha vaciado tu selección.",
            "success"
        );

    }


    /* ========================================================
       15. CREACIÓN DE LAS LÍNEAS DEL PRESUPUESTO
    ======================================================== */


    /**
     * Genera una línea de producto.
     */

    function createCartItem(productId, quantity) {

        const product = getProductData(productId);

        if (!product) {
            return null;
        }

        const item = createElement(
            "article",
            "cart-item budget-item"
        );

        item.dataset.productId = productId;


        /* INFORMACIÓN */

        const information = createElement(
            "div",
            "cart-item-info"
        );

        const name = createElement(
            "h4",
            "cart-item-name",
            product.name
        );

        const category = createElement(
            "span",
            "cart-item-category",
            product.category
        );

        information.append(name, category);


        /* CONTROLES */

        const controls = createElement(
            "div",
            "cart-item-controls"
        );


        const decreaseButton = createElement(
            "button",
            "cart-quantity-button cart-decrease",
            "−"
        );

        decreaseButton.type = "button";

        decreaseButton.dataset.cartAction = "decrease";

        decreaseButton.dataset.productId = productId;

        decreaseButton.setAttribute(
            "aria-label",
            `Reducir cantidad de ${product.name}`
        );


        const quantityDisplay = createElement(
            "span",
            "cart-item-quantity",
            formatQuantity(quantity)
        );

        quantityDisplay.setAttribute(
            "aria-label",
            "Cantidad seleccionada"
        );


        const increaseButton = createElement(
            "button",
            "cart-quantity-button cart-increase",
            "+"
        );

        increaseButton.type = "button";

        increaseButton.dataset.cartAction = "increase";

        increaseButton.dataset.productId = productId;

        increaseButton.setAttribute(
            "aria-label",
            `Aumentar cantidad de ${product.name}`
        );


        controls.append(
            decreaseButton,
            quantityDisplay,
            increaseButton
        );


        /* PRECIO */

        const price = createElement(
            "span",
            "cart-item-price"
        );

        if (product.price !== null) {

            price.textContent =
                `${formatCurrency(product.price)} / unidad`;

        } else {

            price.textContent = "Precio por confirmar";

        }


        /* ELIMINAR */

        const removeButton = createElement(
            "button",
            "cart-remove-button",
            "Eliminar"
        );

        removeButton.type = "button";

        removeButton.dataset.cartAction = "remove";

        removeButton.dataset.productId = productId;

        removeButton.setAttribute(
            "aria-label",
            `Eliminar ${product.name} de la selección`
        );


        item.append(
            information,
            controls,
            price,
            removeButton
        );

        return item;

    }


    /* ========================================================
       16. CÁLCULO ORIENTATIVO DEL PRESUPUESTO
    ======================================================== */


    /**
     * Solo calcula importes si TODOS los productos
     * seleccionados tienen un precio unitario válido.

     * Si falta un precio, no presenta un subtotal
     * incompleto como si fuera el presupuesto final.
     */

    function calculateCartTotal() {

        if (!hasProducts()) {

            return {

                available: false,

                total: null

            };

        }

        let total = 0;

        for (const [productId, quantity] of cart) {

            const product = getProductData(productId);

            if (
                !product ||
                product.price === null
            ) {

                return {

                    available: false,

                    total: null

                };

            }

            total += product.price * quantity;

        }

        return {

            available: true,

            total: total

        };

    }


    /* ========================================================
       17. ACTUALIZACIÓN VISUAL DEL PRESUPUESTO
    ======================================================== */


    /**
     * Actualiza el contador.
     */

    function updateCartCounter() {

        if (!exists(elements.cartCounter)) {
            return;
        }

        const units = getTotalUnits();

        const products = cart.size;

        elements.cartCounter.textContent =
            `${formatQuantity(units)} ${units === 1 ? "unidad" : "unidades"} · ` +
            `${products} ${products === 1 ? "producto" : "productos"}`;

        elements.cartCounter.dataset.count =
            String(units);

    }


    /**
     * Actualiza el total.
     */

    function updateCartTotal() {

        if (!exists(elements.cartTotal)) {
            return;
        }

        const result = calculateCartTotal();

        if (!hasProducts()) {

            elements.cartTotal.textContent =
                "Pendiente de presupuesto";

            return;

        }

        if (!result.available) {

            elements.cartTotal.textContent =
                "Pendiente de presupuesto";

            return;

        }

        elements.cartTotal.textContent =
            formatCurrency(result.total);

    }


    /**
     * Dibuja todo el contenido del presupuesto.
     */

    function renderCart() {

        if (!exists(elements.cartItems)) {
            return;
        }

        /*
           Limpiamos el contenedor sin utilizar
           HTML procedente de datos del visitante.
        */

        elements.cartItems.replaceChildren();

        if (!hasProducts()) {

            const emptyMessage = createElement(
                "p",
                "empty-cart-message",
                "Todavía no has añadido productos. Explora el catálogo y selecciona lo que necesitas."
            );

            elements.cartItems.appendChild(
                emptyMessage
            );

        } else {

            cart.forEach((quantity, productId) => {

                const item = createCartItem(
                    productId,
                    quantity
                );

                if (item) {

                    elements.cartItems.appendChild(item);

                }

            });

        }

        updateCartCounter();

        updateCartTotal();

        /*
           Reflejamos las cantidades actuales
           en los campos del catálogo.
        */

        elements.productCards.forEach(card => {

            const id = card.dataset.productId;

            const input = $(
                ".product-quantity",
                card
            );

            if (!input) {
                return;
            }

            /*
               No sobreescribimos el campo mientras
               el usuario esté escribiendo en él.
            */

            if (document.activeElement === input) {
                return;
            }

            input.value = "0";

        });

        /*
           Actualizamos la nota del presupuesto.
        */

        if (exists(elements.quoteNote)) {

            elements.quoteNote.textContent =
                "Los precios definitivos, descuentos por lotes, disponibilidad y transporte se confirmarán mediante presupuesto personalizado.";

        }

    }


    /* ========================================================
       18. EVENTOS DE LOS CONTROLES DEL PRESUPUESTO
    ======================================================== */


    function initializeCartEvents() {

        /*
           Delegación de eventos para los botones
           que se crean dinámicamente.
        */

        if (exists(elements.cartItems)) {

            elements.cartItems.addEventListener(
                "click",
                event => {

                    const button = event.target.closest(
                        "[data-cart-action]"
                    );

                    if (!button) {
                        return;
                    }

                    const productId =
                        button.dataset.productId;

                    const action =
                        button.dataset.cartAction;

                    if (!productId) {
                        return;
                    }

                    if (action === "increase") {

                        updateCartQuantity(
                            productId,
                            1
                        );

                    }

                    if (action === "decrease") {

                        updateCartQuantity(
                            productId,
                            -1
                        );

                    }

                    if (action === "remove") {

                        removeProduct(productId);

                    }

                }
            );

        }

        /*
           Vaciar selección.
        */

        if (exists(elements.clearBudgetButton)) {

            elements.clearBudgetButton.addEventListener(
                "click",
                clearCart
            );

        }

    }


    /* ========================================================
       19. VALIDACIÓN DEL FORMULARIO
    ======================================================== */


    /**
     * Recupera el contenido de un campo.
     */

    function getFieldValue(element) {

        if (!exists(element)) {
            return "";
        }

        return element.value.trim();

    }


    /**
     * Comprueba que la fecha no esté en el pasado.
     */

    function isValidEventDate(dateValue) {

        if (!dateValue) {
            return false;
        }

        /*
           Trabajamos con formato ISO para evitar
           problemas de interpretación de fechas.
        */

        const selectedDate = new Date(
            `${dateValue}T00:00:00`
        );

        if (Number.isNaN(selectedDate.getTime())) {
            return false;
        }

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        return selectedDate >= today;

    }


    /**
     * Valida todos los campos necesarios.
     */

    function validateBudgetForm() {

        const errors = [];


        const name = getFieldValue(
            elements.customerName
        );

        const date = getFieldValue(
            elements.eventDate
        );

        const location = getFieldValue(
            elements.eventLocation
        );

        const people = getFieldValue(
            elements.eventPeople
        );


        if (name.length < 2) {

            errors.push(
                "Introduce tu nombre."
            );

        }


        if (!date) {

            errors.push(
                "Selecciona la fecha del evento."
            );

        } else if (!isValidEventDate(date)) {

            errors.push(
                "La fecha del evento no puede estar en el pasado."
            );

        }


        if (location.length < 2) {

            errors.push(
                "Indica la localidad del evento."
            );

        }


        if (
            people !== "" &&
            (
                !Number.isInteger(Number(people)) ||
                Number(people) < 1
            )
        ) {

            errors.push(
                "El número de asistentes debe ser un entero mayor que cero."
            );

        }


        if (!elements.privacyAccept?.checked) {

            errors.push(
                "Debes marcar la casilla de aceptación de privacidad."
            );

        }


        if (!hasProducts()) {

            errors.push(
                "Añade al menos un producto a tu selección."
            );

        }


        if (errors.length > 0) {

            return {

                valid: false,

                errors: errors

            };

        }


        return {

            valid: true,

            errors: []

        };

    }


    /**
     * Muestra los errores de validación.
     */

    function showValidationErrors(errors) {

        const message =
            errors.map((error, index) =>
                `${index + 1}. ${error}`
            ).join("\n");

        showToast(
            errors[0],
            "error"
        );

        console.warn(
            "Errores del formulario:\n" + message
        );

    }


    /* ========================================================
       20. PREPARACIÓN DEL MENSAJE DE WHATSAPP
    ======================================================== */


    /**
     * Convierte una fecha ISO en formato español.
     */

    function formatDate(dateValue) {

        if (!dateValue) {
            return "No indicada";
        }

        const parts = dateValue.split("-");

        if (parts.length !== 3) {
            return dateValue;
        }

        return `${parts[2]}/${parts[1]}/${parts[0]}`;

    }


    /**
     * Construye el mensaje del presupuesto.
     */

    function buildBudgetMessage() {

        const name = getFieldValue(
            elements.customerName
        );

        const date = getFieldValue(
            elements.eventDate
        );

        const location = getFieldValue(
            elements.eventLocation
        );

        const people = getFieldValue(
            elements.eventPeople
        );

        const comments = getFieldValue(
            elements.customerComments
        );


        const lines = [];


        lines.push(
            "SOLICITUD DE PRESUPUESTO"
        );

        lines.push(
            "ALQUILER DE MATERIAL - CATERING GIL & ROMÁN"
        );

        lines.push("");

        lines.push(
            "DATOS DEL EVENTO"
        );

        lines.push(
            `Nombre: ${name}`
        );

        lines.push(
            `Fecha: ${formatDate(date)}`
        );

        lines.push(
            `Localidad: ${location}`
        );

        lines.push(
            `Asistentes aproximados: ${people || "No indicado"}`
        );

        lines.push("");

        lines.push(
            "MATERIAL SOLICITADO"
        );


        /*
           Agrupamos los productos por categoría.
        */

        const categories = new Map();

        cart.forEach((quantity, productId) => {

            const product = getProductData(productId);

            if (!product) {
                return;
            }

            if (!categories.has(product.category)) {

                categories.set(
                    product.category,
                    []
                );

            }

            categories.get(
                product.category
            ).push({

                name: product.name,

                quantity: quantity

            });

        });


        categories.forEach((products, category) => {

            lines.push("");

            lines.push(
                category.toUpperCase()
            );

            products.forEach(product => {

                lines.push(
                    `- ${product.name}: ${formatQuantity(product.quantity)} unidades`
                );

            });

        });


        lines.push("");

        lines.push(
            "Precios: pendientes de confirmación."
        );

        lines.push(
            "Transporte: consultar coste según localidad."
        );

        lines.push("");

        if (comments) {

            lines.push(
                "OBSERVACIONES"
            );

            lines.push(comments);

            lines.push("");

        }


        lines.push(
            "Hola, quisiera recibir información sobre disponibilidad y presupuesto para este material."
        );


        return lines.join("\n");

    }


    /**
     * Abre WhatsApp con el presupuesto.
     */

    function sendBudgetToWhatsApp() {

        const validation = validateBudgetForm();

        if (!validation.valid) {

            showValidationErrors(
                validation.errors
            );

            /*
               Llevamos al visitante al formulario.
            */

            const firstMissingField = [
                elements.customerName,
                elements.eventDate,
                elements.eventLocation,
                elements.eventPeople,
                elements.privacyAccept
            ].find(field => {

                if (!exists(field)) {
                    return false;
                }

                if (field === elements.privacyAccept) {

                    return !field.checked;

                }

                return !field.value.trim();

            });

            if (firstMissingField) {

                firstMissingField.focus();

            }

            return;

        }


        const message = buildBudgetMessage();

        const whatsappUrl =
            `https://wa.me/${CONFIG.whatsapp}?text=` +
            encodeURIComponent(message);


        /*
           Abrimos WhatsApp en una pestaña nueva.
        */

        const whatsappWindow = window.open(
            whatsappUrl,
            "_blank",
            "noopener,noreferrer"
        );


        if (whatsappWindow) {

            showToast(
                "Se ha preparado tu solicitud en WhatsApp.",
                "success"
            );

        } else {

            /*
               Alternativa si el navegador bloquea
               la apertura de una nueva pestaña.
            */

            window.location.href = whatsappUrl;

        }

    }


    /* ========================================================
       21. EVENTO DEL BOTÓN DE PRESUPUESTO
    ======================================================== */


    function initializeBudgetForm() {

        if (!exists(elements.sendBudgetButton)) {
            return;
        }

        elements.sendBudgetButton.addEventListener(
            "click",
            sendBudgetToWhatsApp
        );


        /*
           Evitamos asistentes negativos.
        */

        if (exists(elements.eventPeople)) {

            elements.eventPeople.min = "1";

            elements.eventPeople.addEventListener(
                "change",
                () => {

                    const value =
                        elements.eventPeople.value;

                    if (
                        value !== "" &&
                        Number(value) < 1
                    ) {

                        elements.eventPeople.value = "1";

                    }

                }
            );

        }

    }


    /* ========================================================
       22. WHATSAPP INDIVIDUAL DE PRODUCTOS
    ======================================================== */


    /**
     * Prepara un mensaje para un producto concreto.

     * Función disponible para futuras ampliaciones
     * del HTML, sin modificar la lógica general.
     */

    function buildProductWhatsAppMessage(
        productId,
        quantity
    ) {

        const product = getProductData(productId);

        if (!product) {
            return "";
        }

        const validQuantity =
            normalizeQuantity(quantity);

        return (
            `Hola, quisiera consultar el alquiler de ` +
            `${formatQuantity(validQuantity)} unidades de ` +
            `${product.name}. ¿Podrían informarme sobre ` +
            `disponibilidad y precio?`
        );

    }


    /**
     * Abre WhatsApp para un producto individual.

     * Puede utilizarse posteriormente en botones
     * con el atributo data-product-whatsapp.
     */

    function openProductWhatsApp(productId, quantity) {

        const message = buildProductWhatsAppMessage(
            productId,
            quantity
        );

        if (!message) {
            return;
        }

        const url =
            `https://wa.me/${CONFIG.whatsapp}?text=` +
            encodeURIComponent(message);

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

    }


    /* ========================================================
       23. CONTROL DE IMÁGENES
    ======================================================== */


    /**
     * Detecta imágenes que no se pueden cargar.
     *
     * No cambia las rutas originales.
     */

    function initializeImageHandling() {

        const images = $$("img");

        images.forEach(img => {

            /*
               Si la imagen falla, añadimos una clase
               para que CSS pueda mostrar una alternativa.
            */

            img.addEventListener("error", () => {

                img.classList.add("image-error");

                img.dataset.imageError = "true";

                console.warn(
                    "No se ha podido cargar la imagen:",
                    img.getAttribute("src")
                );

                const container =
                    img.closest(
                        ".product-image-container, .product-image-wrapper"
                    );

                if (container) {

                    container.classList.add(
                        "has-image-error"
                    );

                }

            });


            /*
               Cuando se carga correctamente,
               retiramos cualquier estado de error.
            */

            img.addEventListener("load", () => {

                img.classList.remove("image-error");

                delete img.dataset.imageError;

                const container =
                    img.closest(
                        ".product-image-container, .product-image-wrapper"
                    );

                if (container) {

                    container.classList.remove(
                        "has-image-error"
                    );

                }

            });

        });

    }


    /* ========================================================
       24. ACCESIBILIDAD Y TECLADO
    ======================================================== */


    function initializeKeyboardControls() {

        document.addEventListener("keydown", event => {

            /*
               Escape cierra el menú móvil.
            */

            if (event.key === "Escape") {

                closeMobileMenu();

            }

        });


        /*
           Si el visitante pulsa Enter en un campo
           del formulario, evitamos comportamientos
           de envío accidental.
        */

        const formInputs = [

            elements.customerName,

            elements.eventDate,

            elements.eventLocation,

            elements.eventPeople

        ].filter(Boolean);


        formInputs.forEach(input => {

            input.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        const nextIndex =
                            formInputs.indexOf(input) + 1;

                        if (formInputs[nextIndex]) {

                            formInputs[nextIndex].focus();

                        } else if (
                            exists(elements.customerComments)
                        ) {

                            elements.customerComments.focus();

                        }

                    }

                }
            );

        });

    }


    /* ========================================================
       25. ACTUALIZACIÓN AUTOMÁTICA DEL FOOTER
    ======================================================== */


    function updateFooterYear() {

        if (!exists(elements.currentYear)) {
            return;
        }

        elements.currentYear.textContent =
            String(new Date().getFullYear());

    }


    /* ========================================================
       26. ENLACES DE WHATSAPP
    ======================================================== */


    /**
     * Comprobación de enlaces externos.
     */

    function initializeWhatsAppLinks() {

        const whatsappLinks = $$(
            'a[href*="wa.me/"]'
        );

        whatsappLinks.forEach(link => {

            link.setAttribute(
                "target",
                "_blank"
            );

            link.setAttribute(
                "rel",
                "noopener noreferrer"
            );

        });

    }


    /* ========================================================
       27. OBSERVACIÓN DE ANIMACIONES
    ======================================================== */


    /**
     * Añade una clase cuando los elementos entran
     * en pantalla.

     * El CSS podrá definir las transiciones mediante
     * la clase .is-visible.
     */

    function initializeRevealObserver() {

        const selectors = [

            ".advantage-card",

            ".product-card",

            ".step-card",

            ".condition-card",

            ".contact-item"

        ];


        const revealElements = selectors.flatMap(
            selector => $$(selector)
        );


        if (
            !revealElements.length ||
            !("IntersectionObserver" in window)
        ) {

            revealElements.forEach(element => {

                element.classList.add("is-visible");

            });

            return;

        }


        const reducedMotion =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;


        if (reducedMotion) {

            revealElements.forEach(element => {

                element.classList.add("is-visible");

            });

            return;

        }


        const observer = new IntersectionObserver(

            (entries, currentObserver) => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add(
                        "is-visible"
                    );

                    currentObserver.unobserve(
                        entry.target
                    );

                });

            },

            {

                threshold: 0.08,

                rootMargin: "0px 0px 40px 0px"

            }

        );


        revealElements.forEach(element => {

            observer.observe(element);

        });

    }


    /* ========================================================
       28. COMPROBACIÓN DE LA ESTRUCTURA HTML
    ======================================================== */


    function checkRequiredElements() {

        const required = [

            elements.mobileMenuButton,

            elements.mobileNavigation,

            elements.cartItems,

            elements.cartCounter,

            elements.cartTotal,

            elements.sendBudgetButton,

            elements.customerName,

            elements.eventDate,

            elements.eventLocation,

            elements.privacyAccept

        ];


        const missing = required.filter(
            element => !element
        );


        if (missing.length > 0) {

            console.warn(
                "Alquiler Material: faltan algunos elementos HTML necesarios."
            );

        }

    }


    /* ========================================================
       29. INICIALIZACIÓN GENERAL DEL PROYECTO
    ======================================================== */

    function initializeApplication() {

        /*
           PASO 1
           Comprobación del HTML.
        */

        checkRequiredElements();


        /*
           PASO 2
           Catálogo.
        */

        validateCatalog();


        /*
           PASO 3
           Recuperar selección guardada.
        */

        loadCart();


        /*
           PASO 4
           Dibujar presupuesto.
        */

        renderCart();


        /*
           PASO 5
           Navegación.
        */

        initializeSmoothNavigation();


        /*
           PASO 6
           Menú móvil.
        */

        initializeMobileMenu();


        /*
           PASO 7
           Cabecera.
        */

        initializeHeaderScroll();


        /*
           PASO 8
           Categorías activas.
        */

        initializeCategoryObserver();


        /*
           PASO 9
           Cantidades.
        */

        initializeQuantityInputs();


        /*
           PASO 10
           Botones Añadir.
        */

        initializeAddButtons();


        /*
           PASO 11
           Eventos del presupuesto.
        */

        initializeCartEvents();


        /*
           PASO 12
           Formulario.
        */

        initializeBudgetForm();


        /*
           PASO 13
           Imágenes.
        */

        initializeImageHandling();


        /*
           PASO 14
           Teclado y accesibilidad.
        */

        initializeKeyboardControls();


        /*
           PASO 15
           Enlaces externos.
        */

        initializeWhatsAppLinks();


        /*
           PASO 16
           Año del footer.
        */

        updateFooterYear();


        /*
           PASO 17
           Animaciones.
        */

        initializeRevealObserver();


        /*
           PASO 18
           Estado inicial.
        */

        closeMobileMenu();


        console.info(
            "Catering Gil & Román: aplicación de alquiler inicializada correctamente."
        );

    }


    /* ========================================================
       30. ARRANQUE
    ======================================================== */

    initializeApplication();


    /* ========================================================
       31. INTERFAZ PÚBLICA PARA FUTURAS AMPLIACIONES
    ======================================================== */

    /*
       Permitirá conectar futuras funciones sin
       duplicar la lógica del carrito.

       Ejemplos de uso desde otros scripts:

       AlquilerMaterial.addProduct("mesa-roja");

       AlquilerMaterial.removeProduct("mesa-roja");

       AlquilerMaterial.clearCart();

       AlquilerMaterial.getTotalUnits();

       AlquilerMaterial.openProductWhatsApp(
           "silla-verde-alta",
           30
       );
    */

    window.AlquilerMaterial = {

        addProduct,

        removeProduct,

        clearCart,

        updateCartQuantity,

        renderCart,

        getTotalUnits,

        getProductData,

        buildBudgetMessage,

        buildProductWhatsAppMessage,

        openProductWhatsApp,

        closeMobileMenu,

        openMobileMenu

    };


});
