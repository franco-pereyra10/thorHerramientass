// Usa la instancia global "db" que se inicializa en index.html

const COLECCION_PRODUCTOS = "productos";
const NUMERO_WHATSAPP = "5491156465544"; // cambiá por el número real del negocio

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

// ---------------------- FIRESTORE ----------------------

async function cargarProductosDesdeFirestore() {
  const snapshot = await db.collection(COLECCION_PRODUCTOS).orderBy("nombre").get();
  productos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// ---------------------- CARRITO -------------------------

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
  span.textContent = totalItems;
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
  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  lista.forEach(producto => {
    const agotado = producto.stock <= 0;
    const textoInalambrico = producto.inalambrico ? "Inalámbrico" : "Con cable";

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
      <img src="${producto.imagen}" alt="${producto.nombre}">
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
  const texto = document.getElementById("buscador").value.toLowerCase();
  const marca = document.getElementById("filtro-marca").value;
  const filtroInalambrico = document.getElementById("filtro-inalambrico").value;
  const orden = document.getElementById("orden-precio").value;

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
  const agotado = producto.stock <= 0;
  const textoInalambrico = producto.inalambrico ? "Inalámbrico" : "Con cable";

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

  panel.innerHTML = `
    <div class="detalle-panel-contenido">
      <div class="detalle-header">
        <h2>${producto.nombre}</h2>
        <button id="btn-cerrar-detalle" class="btn-cerrar-detalle">✕</button>
      </div>
      <div class="detalle-body">
        <div class="detalle-imagen-contenedor">
          <img src="${producto.imagen}" alt="${producto.nombre}">
        </div>
        <div class="detalle-info">
          <p class="detalle-precio">${formatearPrecio(producto.precio)}</p>
          <p class="detalle-stock">${agotado ? "Producto agotado" : `Stock disponible: ${producto.stock} unidades`}</p>
          <p class="detalle-descripcion">${producto.descripcion || ""}</p>
          <p><strong>Marca:</strong> ${producto.marca || "-"} · ${textoInalambrico}</p>
          ${(producto.detalles && producto.detalles.length > 0) ? `
            <ul class="detalle-lista">
              ${producto.detalles.map(d => `<li>${d}</li>`).join("")}
            </ul>` : ""
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
  document.getElementById("detalle-backdrop").classList.remove("oculto");

  document.getElementById("btn-cerrar-detalle").addEventListener("click", cerrarDetalleProducto);

  const btnAgregar = panel.querySelector(".btn-agregar:not(.btn-agotado)");
  if (btnAgregar) {
    btnAgregar.addEventListener("click", e => {
      const id = e.target.dataset.id;
      agregarAlCarrito(id);
    });
  }

  const btnComprarAhora = panel.querySelector(".btn-comprar-ahora");
  if (btnComprarAhora) {
    btnComprarAhora.addEventListener("click", e => {
      const id = e.target.dataset.id;
      comprarAhora(id);
    });
  }
}

function cerrarDetalleProducto() {
  document.getElementById("detalle-panel").classList.add("oculto");
  document.getElementById("detalle-backdrop").classList.add("oculto");
}

// ---------------------- PANEL CARRITO --------------------

function abrirCarrito() {
  document.getElementById("carrito-panel").classList.remove("oculto");
  document.getElementById("carrito-backdrop").classList.remove("oculto");
}

function cerrarCarrito() {
  document.getElementById("carrito-panel").classList.add("oculto");
  document.getElementById("carrito-backdrop").classList.add("oculto");
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
  document.getElementById("buscador").addEventListener("input", aplicarFiltros);
  document.getElementById("filtro-marca").addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-inalambrico").addEventListener("change", aplicarFiltros);
  document.getElementById("orden-precio").addEventListener("change", aplicarFiltros);

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

  // Carrito
  document.getElementById("btn-ver-carrito").addEventListener("click", abrirCarrito);
  document.getElementById("btn-cerrar-carrito").addEventListener("click", cerrarCarrito);
  document.getElementById("carrito-backdrop").addEventListener("click", cerrarCarrito);

  document.getElementById("btn-vaciar-carrito").addEventListener("click", () => {
    if (carrito.length === 0) return;
    vaciarCarrito();
  });

  const carritoItems = document.getElementById("carrito-items");
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

  document.getElementById("btn-finalizar-compra").addEventListener("click", (e) => {
    e.preventDefault();
    const link = generarLinkWhatsAppCarrito();
    if (link) window.location.href = link;
  });

  document.getElementById("detalle-backdrop").addEventListener("click", cerrarDetalleProducto);
});
