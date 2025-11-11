// Usamos la instancia global "db" creada en admin.html
const productosRef = db.collection("productos");

let productos = [];

function formatearPrecio(numero) {
  return numero.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0
  });
}

function limpiarFormulario() {
  document.getElementById("prod-id").value = "";
  document.getElementById("prod-nombre").value = "";
  document.getElementById("prod-marca").value = "";
  document.getElementById("prod-precio").value = "";
  document.getElementById("prod-stock").value = "";
  document.getElementById("prod-categoria").value = "";
  document.getElementById("prod-inalambrico").value = "false";
  document.getElementById("prod-imagen").value = "";
  document.getElementById("prod-descripcion").value = "";
  document.getElementById("prod-envios").value = "";
  document.getElementById("prod-detalles").value = "";
}

function cargarProductoEnFormulario(id, prod) {
  document.getElementById("prod-id").value = id;
  document.getElementById("prod-nombre").value = prod.nombre || "";
  document.getElementById("prod-marca").value = prod.marca || "";
  document.getElementById("prod-precio").value = prod.precio || 0;
  document.getElementById("prod-stock").value = prod.stock || 0;
  document.getElementById("prod-categoria").value = prod.categoria || "";
  document.getElementById("prod-inalambrico").value = prod.inalambrico ? "true" : "false";
  document.getElementById("prod-imagen").value = prod.imagen || "";
  document.getElementById("prod-descripcion").value = prod.descripcion || "";
  document.getElementById("prod-envios").value = (prod.opcionesEnvio || []).join(", ");
  document.getElementById("prod-detalles").value = (prod.detalles || []).join("\n");
}

function renderTablaProductos() {
  const tbody = document.getElementById("tabla-productos-body");
  tbody.innerHTML = "";

  if (productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay productos cargados.</td></tr>`;
    return;
  }

  productos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.data.nombre || "-"}</td>
      <td>${p.data.marca || "-"}</td>
      <td>${formatearPrecio(p.data.precio || 0)}</td>
      <td>${p.data.stock ?? "-"}</td>
      <td>${p.data.inalambrico ? "Sí" : "No"}</td>
      <td>
        <div class="admin-table-actions">
          <button class="btn-principal btn-pequeño" data-accion="editar" data-id="${p.id}">Editar</button>
          <button class="btn-secundario btn-pequeño" data-accion="eliminar" data-id="${p.id}">Eliminar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function cargarProductosDesdeFirestore() {
  const snapshot = await productosRef.orderBy("nombre").get();
  productos = snapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data()
  }));
  renderTablaProductos();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-producto");
  const btnLimpiar = document.getElementById("btn-limpiar-form");
  const tbody = document.getElementById("tabla-productos-body");

  cargarProductosDesdeFirestore().catch(err => {
    console.error("Error cargando productos:", err);
    alert("Hubo un problema cargando los productos.");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("prod-id").value.trim();
    const nombre = document.getElementById("prod-nombre").value.trim();
    const marca = document.getElementById("prod-marca").value.trim();
    const precio = Number(document.getElementById("prod-precio").value || 0);
    const stock = Number(document.getElementById("prod-stock").value || 0);
    const categoria = document.getElementById("prod-categoria").value.trim();
    const inalambrico = document.getElementById("prod-inalambrico").value === "true";
    const imagen = document.getElementById("prod-imagen").value.trim();
    const descripcion = document.getElementById("prod-descripcion").value.trim();
    const enviosText = document.getElementById("prod-envios").value;
    const detallesText = document.getElementById("prod-detalles").value;

    if (!nombre) {
      alert("El nombre es obligatorio.");
      return;
    }

    const opcionesEnvio = enviosText
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const detalles = detallesText
      .split("\n")
      .map(t => t.trim())
      .filter(Boolean);

    const producto = {
      nombre,
      marca,
      precio,
      stock,
      categoria,
      inalambrico,
      imagen: imagen || "https://via.placeholder.com/300x200?text=Producto",
      descripcion,
      opcionesEnvio,
      detalles
    };

    try {
      if (id) {
        await productosRef.doc(id).update(producto);
        alert("Producto actualizado correctamente.");
      } else {
        await productosRef.add(producto);
        alert("Producto creado correctamente.");
      }
      limpiarFormulario();
      await cargarProductosDesdeFirestore();
    } catch (err) {
      console.error("Error guardando producto:", err);
      alert("Hubo un error guardando el producto.");
    }
  });

  btnLimpiar.addEventListener("click", () => {
    limpiarFormulario();
  });

  tbody.addEventListener("click", async (e) => {
    const accion = e.target.dataset.accion;
    const id = e.target.dataset.id;
    if (!accion || !id) return;

    const prodEntry = productos.find(p => p.id === id);
    if (!prodEntry) return;

    if (accion === "editar") {
      cargarProductoEnFormulario(id, prodEntry.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (accion === "eliminar") {
      const confirmar = confirm(`¿Seguro que querés eliminar "${prodEntry.data.nombre}"?`);
      if (!confirmar) return;
      try {
        await productosRef.doc(id).delete();
        await cargarProductosDesdeFirestore();
        alert("Producto eliminado.");
      } catch (err) {
        console.error("Error eliminando producto:", err);
        alert("No se pudo eliminar el producto.");
      }
    }
  });
});
