import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Platform } from "react-native";
import { listarCodigos, actualizarCodigo, eliminarCodigo } from "../api";

export default function CodigosScreen({ navigation }) {
  // Estados para la lista de códigos
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para el modal de edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCodigo, setEditCodigo] = useState("");
  const [editActivo, setEditActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para el modal de eliminación
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Carga la lista de códigos desde la API
  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await listarCodigos();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // Mensajes de error específicos
      let mensajeError = "No se pudieron cargar los códigos. Intenta nuevamente.";
      
      if (e.message) {
        if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      setError(mensajeError);
      if (Platform.OS === "web") {
        alert(`Error al cargar códigos: ${mensajeError}`);
      } else {
        Alert.alert("Error al cargar códigos", mensajeError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar la lista al hacer pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listarCodigos();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // Mensajes de error específicos
      let mensajeError = "No se pudieron cargar los códigos. Intenta nuevamente.";
      
      if (e.message) {
        if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      setError(mensajeError);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Carga los códigos al montar el componente
  useEffect(() => { load(); }, []);

  // Abre el modal de edición con los datos del código seleccionado
  const abrirEditar = (item) => {
    setEditingItem(item);
    setEditNombre(item.evaluado_nombre || "");
    setEditCodigo(item.codigo || "");
    setEditActivo(item.activo === 1);
    setEditModalVisible(true);
  };

  // Cierra el modal de edición y limpia los estados
  const cerrarEditar = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditNombre("");
    setEditCodigo("");
    setEditActivo(true);
  };

  // Guarda los cambios realizados en el código
  const guardarEdicion = async () => {
    if (!editingItem) return;
    
    if (!editNombre.trim()) {
      const mensaje = "El nombre del evaluado es obligatorio. Por favor ingresa un nombre válido.";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Campo requerido", mensaje);
      }
      return;
    }
    
    if (!editCodigo.trim()) {
      const mensaje = "El código es obligatorio. Por favor ingresa un código válido.";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Campo requerido", mensaje);
      }
      return;
    }
    
    if (editCodigo.trim().length !== 6) {
      const mensaje = "El código debe tener exactamente 6 caracteres (3 letras y 3 números).";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Código inválido", mensaje);
      }
      return;
    }

    setSaving(true);
    try {
      const datos = {
        evaluado_nombre: editNombre.trim(),
        codigo: editCodigo.trim(),
        activo: editActivo,
      };
      
      await actualizarCodigo(editingItem.id, datos);
      cerrarEditar();
      await load(); // Recargar la lista
      if (Platform.OS === "web") {
        alert("Éxito: El código se actualizó correctamente.");
      } else {
        Alert.alert("Éxito", "El código se actualizó correctamente.");
      }
    } catch (e) {
      // Mensajes de error específicos
      let mensajeError = "No se pudo actualizar el código. Intenta nuevamente.";
      let tituloError = "Error al actualizar";
      
      if (e.message) {
        if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          tituloError = "Sesión expirada";
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("duplicado") || e.message.includes("409")) {
          tituloError = "Código duplicado";
          mensajeError = `El código "${editCodigo.trim().toUpperCase()}" ya existe. Por favor usa otro código.`;
        } else if (e.message.includes("no encontrado") || e.message.includes("404")) {
          tituloError = "Código no encontrado";
          mensajeError = "El código que intentas editar ya no existe. La lista se actualizará.";
          await load();
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          tituloError = "Error de conexión";
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión a internet.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          tituloError = "Error de conexión";
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      if (Platform.OS === "web") {
        alert(`${tituloError}: ${mensajeError}`);
      } else {
        Alert.alert(tituloError, mensajeError);
      }
    } finally {
      setSaving(false);
    }
  };

  // Abre el modal de confirmación para eliminar un código
  const confirmarEliminar = (item) => {
    if (!item || !item.id) {
      const mensaje = "Información del código inválida";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Error", mensaje);
      }
      return;
    }

    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  // Confirma la eliminación después de la validación del usuario
  const confirmarEliminacionFinal = () => {
    if (itemToDelete) {
      setDeleteModalVisible(false);
      eliminar(itemToDelete);
      setItemToDelete(null);
    }
  };

  // Cancela la eliminación y cierra el modal
  const cancelarEliminacion = () => {
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  // Elimina o desactiva el código según tenga sesiones con respuestas
  const eliminar = async (item) => {
    setDeletingId(item.id);
    try {
      const resultado = await eliminarCodigo(item.id);
      await load();
      if (resultado && resultado.desactivado) {
        const mensaje = "El código fue desactivado porque tiene evaluaciones completadas asociadas. No se puede eliminar para mantener la integridad de los datos.";
        if (Platform.OS === "web") {
          alert(`Código desactivado: ${mensaje}`);
        } else {
          Alert.alert("Código desactivado", mensaje);
        }
      } else {
        if (Platform.OS === "web") {
          alert("Éxito: El código se eliminó correctamente.");
        } else {
          Alert.alert("Éxito", "El código se eliminó correctamente.");
        }
      }
    } catch (e) {
      // Mensajes de error específicos
      let mensajeError = "No se pudo eliminar el código. Intenta nuevamente.";
      let tituloError = "Error al eliminar";
      
      if (e.message) {
        if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          tituloError = "Sesión expirada";
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("no encontrado") || e.message.includes("404")) {
          tituloError = "Código no encontrado";
          mensajeError = "El código que intentas eliminar ya no existe. La lista se actualizará.";
          await load();
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          tituloError = "Error de conexión";
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión a internet.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          tituloError = "Error de conexión";
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      if (Platform.OS === "web") {
        alert(`${tituloError}: ${mensajeError}`);
      } else {
        Alert.alert(tituloError, mensajeError);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 12 }}>Códigos</Text>

      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={{ color: "crimson", marginBottom: 12 }}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={{ color: "#6b7280" }}>No hay códigos todavía.</Text>
      ) : (
        <FlatList
          data={items}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => (
            <View
              style={{
                padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
                marginBottom: 10, backgroundColor: "#fff",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700" }}>{item.codigo}</Text>
                    <View
                      style={{
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                        backgroundColor: item.activo ? "#DCFCE7" : "#FEE2E2",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: item.activo ? "#166534" : "#991B1B" }}>
                        {item.activo ? "Activo" : "Inactivo"}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: "#374151", marginTop: 6 }}>
                    Evaluado: {item.evaluado_nombre || "(sin nombre)"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => abrirEditar(item)}
                  disabled={deletingId === item.id}
                  style={{
                    flex: 1,
                    backgroundColor: deletingId === item.id ? "#9CA3AF" : "#3B82F6",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    opacity: deletingId === item.id ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmarEliminar(item)}
                  disabled={deletingId === item.id}
                  style={{
                    flex: 1,
                    backgroundColor: deletingId === item.id ? "#9CA3AF" : "#EF4444",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: deletingId === item.id ? 0.6 : 1,
                    minHeight: 40,
                  }}
                  activeOpacity={0.7}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={{ color: "white", fontWeight: "600", fontSize: 14 }}>Eliminar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          marginTop: 12, alignSelf: "flex-start", backgroundColor: "#111827",
          borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Volver</Text>
      </TouchableOpacity>

      {/* Modal de edición: permite modificar nombre, código y estado activo */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarEditar}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 20 }}>
              Editar Código
            </Text>

            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#374151" }}>
              Código
            </Text>
            <TextInput
              value={editCodigo}
              onChangeText={setEditCodigo}
              placeholder="Ej: ABC123"
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
              autoCapitalize="characters"
            />

            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#374151" }}>
              Nombre del Evaluado *
            </Text>
            <TextInput
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Nombre del evaluado"
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setEditActivo(!editActivo)}
                style={{
                  width: 24,
                  height: 24,
                  borderWidth: 2,
                  borderColor: editActivo ? "#3B82F6" : "#D1D5DB",
                  borderRadius: 4,
                  backgroundColor: editActivo ? "#3B82F6" : "white",
                  marginRight: 12,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {editActivo && (
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>✓</Text>
                )}
              </TouchableOpacity>
              <Text style={{ fontSize: 16, color: "#374151" }}>Código activo</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={cerrarEditar}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: "#E5E7EB",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={guardarEdicion}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: saving ? "#9CA3AF" : "#3B82F6",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "600" }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación de eliminación: solicita confirmación antes de eliminar */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelarEliminacion}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 16 }}>
              Confirmar eliminación
            </Text>

            <Text style={{ fontSize: 16, color: "#374151", marginBottom: 8 }}>
              ¿Estás seguro de que deseas eliminar el código?
            </Text>

            {itemToDelete && (
              <>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 12 }}>
                  {itemToDelete.codigo}
                </Text>
                {itemToDelete.evaluado_nombre && (
                  <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
                    Evaluado: {itemToDelete.evaluado_nombre}
                  </Text>
                )}
              </>
            )}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={cancelarEliminacion}
                style={{
                  flex: 1,
                  backgroundColor: "#E5E7EB",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmarEliminacionFinal}
                style={{
                  flex: 1,
                  backgroundColor: "#EF4444",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
