// Usa la instancia global "db" que se inicializa en index.html (Firebase)

const COLECCION_PRODUCTOS = "productos";
const NUMERO_WHATSAPP = "5491112345678"; // Cambiá por el número real de la ferretería

let productos = [];
let carrito = []; // { id: string, cantidad: number }

// ---------------------- UTILIDADES ----------------------

function formatearPrecio(numero) {
  return numero.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0
  });
}

function obtenerProductoPorId(id) {
  return productos.find(p => p.id === id);
}

function obtenerImagenesProducto(producto) {
  const placeholder = "https://via.placeholder.com/300x200?text=Producto";
  let imagenes = [];

  if (producto.imagenes && producto.imagenes.length) {
    imagenes = producto.imagenes.filter(Boolean);
  } else if (producto.imagen) {
    imagenes = [producto.imagen];
  }

  if (imagenes.length === 0) imagenes = [placeholder];
  return imagenes;
}

// ---------------------- FIRESTORE ----------------------

async function cargarProductosDesdeFirestore() {
  const snapshot = await db.collection(COLECCION_PRODUCTOS).orderBy("nombre").get();
  productos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// ---------------------- CARRITO (LÓGICA) -------------------------

function guardarCarrito() {
  try {
    localStorage.setItem("carritoHerramientas", JSON.stringify(carrito));
  } catch (e) {
    console.warn("No se pudo guardar el carrito", e);
  }
}

function cargarCarrito() {
  try {
    const guardado = localStorage.getItem("carritoHerramientas");
    if (guardado) carrito = JSON.parse(guardado);
  } catch {
    carrito = [];
  }
}

function actualizarContadorCarrito() {
  const span = document.getElementById("cart-count");
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  if (span) span.textContent = totalItems;
}

function agregarAlCarrito(idProducto) {
  const producto = obtenerProductoPorId(idProducto);
  if (!producto) return false;

  if (producto.stock <= 0) {
    alert(`"${producto.nombre}" está agotado.`);
    return false;
  }

  const item = carrito.find(i => i.id === idProducto);
  const cantidadActual = item ? item.cantidad : 0;

  if (cantidadActual >= producto.stock) {
    alert(`No hay más stock disponible de "${producto.nombre}". Stock máximo: ${producto.stock} unidades.`);
    return false;
  }

  if (item) item.cantidad += 1;
  else carrito.push({ id: idProducto, cantidad: 1 });

  guardarCarrito();
  actualizarCarritoUI();
  return true;
}

function comprarAhora(idProducto) {
  const ok = agregarAlCarrito(idProducto);
  if (ok) abrirCarrito();
}

function cambiarCantidad(idProducto, delta) {
  const item = carrito.find(i => i.id === idProducto);
  if (!item) return;
  const producto = obtenerProductoPorId(idProducto);
  if (!producto) return;

  if (delta > 0 && item.cantidad >= producto.stock) {
    alert(`No podés agregar más de ${producto.stock} unidades de "${producto.nombre}".`);
    return;
  }

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carrito = carrito.filter(i => i.id !== idProducto);
  }
  guardarCarrito();
  actualizarCarritoUI();
}

function eliminarDelCarrito(idProducto) {
  carrito = carrito.filter(i => i.id !== idProducto);
  guardarCarrito();
  actualizarCarritoUI();
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarCarritoUI();
}

function calcularTotalCarrito() {
  return carrito.reduce((total, item) => {
    const producto = obtenerProductoPorId(item.id);
    if (!producto) return total;
    return total + producto.precio * item.cantidad;
  }, 0);
}

// ---------------------- UI CARRITO ----------------------

function actualizarCarritoUI() {
  const contenedor = document.getElementById("carrito-items");
  const totalSpan = document.getElementById("carrito-total");
  const btnFinalizar = document.getElementById("btn-finalizar-compra");

  if (!contenedor || !totalSpan || !btnFinalizar) return;

  contenedor.innerHTML = "";

  if (carrito.length === 0) {
    contenedor.innerHTML = "<p>Tu carrito está vacío.</p>";
    totalSpan.textContent = formatearPrecio(0);
    btnFinalizar.classList.add("deshabilitado");
  } else {
    carrito.forEach(item => {
      const producto = obtenerProductoPorId(item.id);
      if (!producto) return;

      const div = document.createElement("div");
      div.className = "carrito-item";
      div.innerHTML = `
        <div class="carrito-item-info">
          <h4>${producto.nombre}</h4>
          <p class="carrito-precio-unitario">${formatearPrecio(producto.precio)} c/u</p>
        </div>
        <div class="carrito-item-controles">
          <button class="btn-cantidad" data-accion="restar" data-id="${item.id}">-</button>
          <span class="carrito-cantidad">${item.cantidad}</span>
          <button class="btn-cantidad" data-accion="sumar" data-id="${item.id}">+</button>
          <span class="carrito-subtotal">${formatearPrecio(producto.precio * item.cantidad)}</span>
          <button class="btn-eliminar" data-id="${item.id}">🗑</button>
        </div>
      `;
      contenedor.appendChild(div);
    });

    totalSpan.textContent = formatearPrecio(calcularTotalCarrito());
    btnFinalizar.classList.remove("deshabilitado");
  }

  actualizarContadorCarrito();
}

function obtenerEnvioSeleccionado() {
  const select = document.getElementById("select-envio");
  if (!select) return "";
  return select.value;
}

function generarLinkWhatsAppCarrito() {
  if (carrito.length === 0) {
    alert("El carrito está vacío.");
    return null;
  }

  const envio = obtenerEnvioSeleccionado();
  if (!envio) {
    alert("Seleccioná una opción de envío en el carrito antes de iniciar la compra.");
    return null;
  }

  const nombre = prompt("Nombre y apellido del cliente:");
  if (nombre === null) return null;

  let direccionCompleta = "";
  if (envio !== "Retiro en el local") {
    const calleAltura = prompt("Calle y altura del cliente:");
    if (calleAltura === null) return null;
    const localidad = prompt("Localidad del cliente:");
    if (localidad === null) return null;
    direccionCompleta = `${(calleAltura || "").trim()} - ${(localidad || "").trim()}`;
  } else {
    direccionCompleta = "Retiro en el local";
  }

  let texto = "Hola, quiero hacer este pedido:\n";
  carrito.forEach(item => {
    const producto = obtenerProductoPorId(item.id);
    if (!producto) return;
    const subtotal = producto.precio * item.cantidad;
    texto += `- ${item.cantidad} x ${producto.nombre} = ${formatearPrecio(subtotal)}\n`;
  });

  texto += `\nTotal: ${formatearPrecio(calcularTotalCarrito())}\n`;
  texto += `Opción de envío: ${envio}\n\n`;
  texto += "Datos del cliente:\n";
  texto += `Nombre: ${nombre || "-"}\n`;
  texto += `Dirección: ${direccionCompleta || "-"}\n`;

  const mensaje = encodeURIComponent(texto);
  return `https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`;
}

// ---------------------- FILTROS Y LISTA ------------------

function obtenerMarcas() {
  const marcas = new Set();
  productos.forEach(p => {
    if (p.marca) marcas.add(p.marca);
  });
  return Array.from(marcas);
}

function cargarMarcasEnFiltro() {
  const select = document.getElementById("filtro-marca");
  if (!select) return;
  select.innerHTML = '<option value="todas">Todas las marcas</option>';
  obtenerMarcas().forEach(marca => {
    const op = document.createElement("option");
    op.value = marca;
    op.textContent = marca;
    select.appendChild(op);
  });
}

function renderProductos(lista) {
  const contenedor = document.getElementById("lista-productos");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  lista.forEach(producto => {
    const agotado = producto.stock <= 0;
    const textoInalambrico = producto.inalambrico ? "Inalámbrico" : "Con cable";
    const imagenes = obtenerImagenesProducto(producto);
    const imagenPrincipal = imagenes[0];

    let botonesHTML;
    if (agotado) {
      botonesHTML = `
        <div class="btn-agregar-contenedor">
          <button class="btn-agregar btn-agotado" disabled>Agotado</button>
        </div>
      `;
    } else {
      botonesHTML = `
        <div class="btn-agregar-contenedor">
          <div class="acciones-producto">
            <button class="btn-agregar" data-id="${producto.id}">Agregar al carrito</button>
            <button class="btn-comprar-ahora" data-id="${producto.id}">Comprar ahora</button>
          </div>
        </div>
      `;
    }

    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-producto";
    tarjeta.dataset.id = producto.id;
    tarjeta.innerHTML = `
      <img src="${imagenPrincipal}" alt="${producto.nombre}">
      <h3>${producto.nombre}</h3>
      <p class="descripcion">${producto.descripcion || ""}</p>
      <p class="precio">${formatearPrecio(producto.precio)}</p>
      <p class="stock">${agotado ? "Producto agotado" : `Stock: ${producto.stock} unidades`}</p>
      <p class="stock">Marca: ${producto.marca || "-"} · ${textoInalambrico}</p>
      <p class="envios">
        Opciones de envío:<br>
        ${(producto.opcionesEnvio || []).map(op => `<span>${op}</span>`).join("")}
      </p>
      ${botonesHTML}
    `;
    contenedor.appendChild(tarjeta);
  });
}

function aplicarFiltros() {
  const textoInput = document.getElementById("buscador");
  const marcaSelect = document.getElementById("filtro-marca");
  const inalamSelect = document.getElementById("filtro-inalambrico");
  const ordenSelect = document.getElementById("orden-precio");

  const texto = textoInput ? textoInput.value.toLowerCase() : "";
  const marca = marcaSelect ? marcaSelect.value : "todas";
  const filtroInalambrico = inalamSelect ? inalamSelect.value : "todos";
  const orden = ordenSelect ? ordenSelect.value : "default";

  let filtrados = productos.filter(p => {
    const coincideTexto =
      p.nombre.toLowerCase().includes(texto) ||
      (p.descripcion || "").toLowerCase().includes(texto);

    const coincideMarca = marca === "todas" ? true : p.marca === marca;

    const coincideInalambrico =
      filtroInalambrico === "todos"
        ? true
        : (filtroInalambrico === "si" && p.inalambrico) ||
          (filtroInalambrico === "no" && !p.inalambrico);

    return coincideTexto && coincideMarca && coincideInalambrico;
  });

  if (orden === "precio-asc") {
    filtrados = filtrados.slice().sort((a, b) => a.precio - b.precio);
  } else if (orden === "precio-desc") {
    filtrados = filtrados.slice().sort((a, b) => b.precio - a.precio);
  }

  renderProductos(filtrados);
}

// ---------------------- DETALLE PRODUCTO -----------------

function abrirDetalleProducto(idProducto) {
  const producto = obtenerProductoPorId(idProducto);
  if (!producto) return;

  const panel = document.getElementById("detalle-panel");
  const backdrop = document.getElementById("detalle-backdrop");
  if (!panel || !backdrop) return;

  const agotado = producto.stock <= 0;
  const textoInalambrico = producto.inalambrico ? "Inalámbrico" : "Con cable";
  const imagenes = obtenerImagenesProducto(producto);

  let botonesHTML;
  if (agotado) {
    botonesHTML = `<button class="btn-agregar btn-agotado" disabled>Agotado</button>`;
  } else {
    botonesHTML = `
      <div class="detalle-botones">
        <button class="btn-agregar" data-id="${producto.id}">Agregar al carrito</button>
        <button class="btn-comprar-ahora" data-id="${producto.id}">Comprar ahora</button>
      </div>
    `;
  }

  const hayCarrusel = imagenes.length > 1;

  panel.innerHTML = `
    <div class="detalle-panel-contenido">
      <div class="detalle-header">
        <h2>${producto.nombre}</h2>
        <button id="btn-cerrar-detalle" class="btn-cerrar-detalle">✕</button>
      </div>
      <div class="detalle-body">
        <div class="detalle-imagen-contenedor">
          <img id="detalle-imagen" src="${imagenes[0]}" alt="${producto.nombre}" style="cursor: zoom-in;">
          ${
            hayCarrusel
              ? `
          <div class="detalle-imagen-controles">
            <button id="detalle-prev" class="detalle-nav">&lt;</button>
            <span id="detalle-indicador" class="detalle-indicador">1 / ${imagenes.length}</span>
            <button id="detalle-next" class="detalle-nav">&gt;</button>
          </div>`
              : ""
          }
        </div>
        <div class="detalle-info">
          <p class="detalle-precio">${formatearPrecio(producto.precio)}</p>
          <p class="detalle-stock">${agotado ? "Producto agotado" : `Stock disponible: ${producto.stock} unidades`}</p>
          <p class="detalle-descripcion">${producto.descripcion || ""}</p>
          <p><strong>Marca:</strong> ${producto.marca || "-"} · ${textoInalambrico}</p>
          ${
            (producto.detalles && producto.detalles.length > 0)
              ? `<ul class="detalle-lista">
                  ${producto.detalles.map(d => `<li>${d}</li>`).join("")}
                 </ul>`
              : ""
          }
          <p class="detalle-envios-titulo">Opciones de envío:</p>
          <ul class="detalle-envios">
            ${(producto.opcionesEnvio || []).map(op => `<li>${op}</li>`).join("")}
          </ul>
          ${botonesHTML}
        </div>
      </div>
    </div>
  `;

  panel.classList.remove("oculto");
  backdrop.classList.remove("oculto");

  const btnCerrar = document.getElementById("btn-cerrar-detalle");
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarDetalleProducto);

  const btnAgregar = panel.querySelector(".btn-agregar:not(.btn-agotado)");
  if (btnAgregar) {
    btnAgregar.addEventListener("click", e => agregarAlCarrito(e.target.dataset.id));
  }

  const btnComprarAhora = panel.querySelector(".btn-comprar-ahora");
  if (btnComprarAhora) {
    btnComprarAhora.addEventListener("click", e => comprarAhora(e.target.dataset.id));
  }

  // Carrusel
  if (hayCarrusel) {
    let indiceActual = 0;
    const imgEl = panel.querySelector("#detalle-imagen");
    const indicador = panel.querySelector("#detalle-indicador");
    const btnPrev = panel.querySelector("#detalle-prev");
    const btnNext = panel.querySelector("#detalle-next");

    function actualizarImagen() {
      imgEl.src = imagenes[indiceActual];
      if (indicador) {
        indicador.textContent = `${indiceActual + 1} / ${imagenes.length}`;
      }
    }

    btnPrev.addEventListener("click", () => {
      indiceActual = (indiceActual - 1 + imagenes.length) % imagenes.length;
      actualizarImagen();
    });

    btnNext.addEventListener("click", () => {
      indiceActual = (indiceActual + 1) % imagenes.length;
      actualizarImagen();
    });

    // Click en la imagen -> ampliar la imagen actual del carrusel
    imgEl.addEventListener("click", () => abrirImagenAmpliada(imagenes[indiceActual]));
  } else {
    const imgEl = panel.querySelector("#detalle-imagen");
    imgEl.addEventListener("click", () => abrirImagenAmpliada(imagenes[0]));
  }
}

// ---------------------- IMAGEN AMPLIADA -----------------

function abrirImagenAmpliada(src) {
  const backdrop = document.getElementById("imagen-ampliada-backdrop");
  const img = document.getElementById("imagen-ampliada");
  const btnCerrar = document.getElementById("cerrar-imagen");

  if (!backdrop || !img || !btnCerrar) return;

  img.src = src;
  backdrop.classList.remove("oculto");

  // Cerramos al tocar el botón o el fondo
  btnCerrar.onclick = () => backdrop.classList.add("oculto");
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      backdrop.classList.add("oculto");
    }
  };
}

function cerrarDetalleProducto() {
  const panel = document.getElementById("detalle-panel");
  const backdrop = document.getElementById("detalle-backdrop");
  if (panel) panel.classList.add("oculto");
  if (backdrop) backdrop.classList.add("oculto");
}

// ---------------------- PANEL CARRITO --------------------

function abrirCarrito() {
  const panel = document.getElementById("carrito-panel");
  const backdrop = document.getElementById("carrito-backdrop");
  if (panel) panel.classList.remove("oculto");
  if (backdrop) backdrop.classList.remove("oculto");
}

function cerrarCarrito() {
  const panel = document.getElementById("carrito-panel");
  const backdrop = document.getElementById("carrito-backdrop");
  if (panel) panel.classList.add("oculto");
  if (backdrop) backdrop.classList.add("oculto");
}

// ---------------------- INICIALIZACIÓN -------------------

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await cargarProductosDesdeFirestore();
  } catch (e) {
    console.error("Error cargando productos:", e);
    alert("No se pudieron cargar los productos.");
  }

  cargarCarrito();
  cargarMarcasEnFiltro();
  renderProductos(productos);
  actualizarCarritoUI();

  // Filtros
  const buscador = document.getElementById("buscador");
  const filtroMarca = document.getElementById("filtro-marca");
  const filtroInalambrico = document.getElementById("filtro-inalambrico");
  const ordenPrecio = document.getElementById("orden-precio");

  if (buscador) buscador.addEventListener("input", aplicarFiltros);
  if (filtroMarca) filtroMarca.addEventListener("change", aplicarFiltros);
  if (filtroInalambrico) filtroInalambrico.addEventListener("change", aplicarFiltros);
  if (ordenPrecio) ordenPrecio.addEventListener("change", aplicarFiltros);

  // Menú de filtros desplegable
  const btnToggleFiltros = document.getElementById("btn-toggle-filtros");
  const filtrosContenido = document.getElementById("filtros-contenido");
  if (btnToggleFiltros && filtrosContenido) {
    btnToggleFiltros.addEventListener("click", () => {
      filtrosContenido.classList.toggle("oculto");
    });
  }

  // Clicks en lista de productos
  const listaProductos = document.getElementById("lista-productos");
  if (listaProductos) {
    listaProductos.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-comprar-ahora")) {
        const id = e.target.dataset.id;
        comprarAhora(id);
        e.stopPropagation();
        return;
      }
      if (e.target.classList.contains("btn-agregar") && !e.target.classList.contains("btn-agotado")) {
        const id = e.target.dataset.id;
        agregarAlCarrito(id);
        e.stopPropagation();
        return;
      }
      const tarjeta = e.target.closest(".tarjeta-producto");
      if (tarjeta) {
        const id = tarjeta.dataset.id;
        abrirDetalleProducto(id);
      }
    });
  }

  // Carrito
  const btnVerCarrito = document.getElementById("btn-ver-carrito");
  const btnCerrarCarrito = document.getElementById("btn-cerrar-carrito");
  const carritoBackdrop = document.getElementById("carrito-backdrop");

  if (btnVerCarrito) btnVerCarrito.addEventListener("click", abrirCarrito);
  if (btnCerrarCarrito) btnCerrarCarrito.addEventListener("click", cerrarCarrito);
  if (carritoBackdrop) carritoBackdrop.addEventListener("click", cerrarCarrito);

  const btnVaciarCarrito = document.getElementById("btn-vaciar-carrito");
  if (btnVaciarCarrito) {
    btnVaciarCarrito.addEventListener("click", () => {
      if (carrito.length === 0) return;
      vaciarCarrito();
    });
  }

  const carritoItems = document.getElementById("carrito-items");
  if (carritoItems) {
    carritoItems.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains("btn-cantidad")) {
        const accion = e.target.dataset.accion;
        if (accion === "sumar") cambiarCantidad(id, +1);
        if (accion === "restar") cambiarCantidad(id, -1);
      }
      if (e.target.classList.contains("btn-eliminar")) {
        eliminarDelCarrito(id);
      }
    });
  }

  const btnFinalizarCompra = document.getElementById("btn-finalizar-compra");
  if (btnFinalizarCompra) {
    btnFinalizarCompra.addEventListener("click", (e) => {
      e.preventDefault();
      const link = generarLinkWhatsAppCarrito();
      if (link) window.location.href = link;
    });
  }

  const detalleBackdrop = document.getElementById("detalle-backdrop");
  if (detalleBackdrop) detalleBackdrop.addEventListener("click", cerrarDetalleProducto);
});

