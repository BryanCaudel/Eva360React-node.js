import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Platform, ScrollView } from "react-native";
import { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from "../api";

export default function UsuariosScreen({ navigation }) {
  // Estados para la lista de usuarios
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para el modal de creación/edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editActivo, setEditActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para el modal de eliminación
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Carga la lista de usuarios desde la API
  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await listarUsuarios();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      let mensajeError = "No se pudieron cargar los usuarios. Intenta nuevamente.";
      
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
        alert(`Error al cargar usuarios: ${mensajeError}`);
      } else {
        Alert.alert("Error al cargar usuarios", mensajeError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar la lista al hacer pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listarUsuarios();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      let mensajeError = "No se pudieron cargar los usuarios. Intenta nuevamente.";
      
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

  // Carga los usuarios al montar el componente
  useEffect(() => { load(); }, []);

  // Abre el modal para crear un nuevo usuario
  const abrirCrear = () => {
    setEditingItem(null);
    setEditUsername("");
    setEditPassword("");
    setEditActivo(true);
    setEditModalVisible(true);
  };

  // Abre el modal de edición con los datos del usuario seleccionado
  const abrirEditar = (item) => {
    setEditingItem(item);
    setEditUsername(item.username || "");
    setEditPassword(""); // No mostrar contraseña existente
    setEditActivo(item.activo === 1);
    setEditModalVisible(true);
  };

  // Cierra el modal de edición y limpia los estados
  const cerrarEditar = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditUsername("");
    setEditPassword("");
    setEditActivo(true);
  };

  // Guarda los cambios realizados en el usuario
  const guardarEdicion = async () => {
    if (!editUsername.trim()) {
      const mensaje = "El nombre de usuario es obligatorio. Por favor ingresa un nombre válido.";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Campo requerido", mensaje);
      }
      return;
    }
    
    // Si es creación o si se está cambiando la contraseña, validar que tenga al menos 4 caracteres
    if (!editingItem || editPassword.trim()) {
      if (!editPassword.trim() || editPassword.trim().length < 4) {
        const mensaje = "La contraseña es obligatoria y debe tener al menos 4 caracteres.";
        if (Platform.OS === "web") {
          alert(mensaje);
        } else {
          Alert.alert("Campo requerido", mensaje);
        }
        return;
      }
    }

    setSaving(true);
    try {
      if (editingItem) {
        // Actualizar usuario existente
        const datos = {
          username: editUsername.trim(),
          activo: editActivo,
        };
        
        // Solo incluir password si se proporcionó uno nuevo
        if (editPassword.trim()) {
          datos.password = editPassword.trim();
        }
        
        await actualizarUsuario(editingItem.id, datos);
      } else {
        // Crear nuevo usuario
        await crearUsuario(editUsername.trim(), editPassword.trim());
      }
      
      cerrarEditar();
      await load();
      
      const mensaje = editingItem ? "Usuario actualizado correctamente." : "Usuario creado correctamente.";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Éxito", mensaje);
      }
    } catch (e) {
      let mensajeError = editingItem 
        ? "No se pudo actualizar el usuario. Intenta nuevamente."
        : "No se pudo crear el usuario. Intenta nuevamente.";
      
      if (e.message) {
        if (e.message.includes("ya existe") || e.message.includes("duplicado") || e.message.includes("409")) {
          mensajeError = "El nombre de usuario ya existe. Por favor elige otro nombre.";
        } else if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeError}`);
      } else {
        Alert.alert("Error", mensajeError);
      }
    } finally {
      setSaving(false);
    }
  };

  // Abre el modal de confirmación de eliminación
  const abrirEliminar = (item) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  // Cierra el modal de eliminación
  const cerrarEliminar = () => {
    setDeleteModalVisible(false);
    setItemToDelete(null);
    setDeletingId(null);
  };

  // Elimina el usuario seleccionado
  const confirmarEliminar = async () => {
    if (!itemToDelete) return;
    
    setDeletingId(itemToDelete.id);
    try {
      await eliminarUsuario(itemToDelete.id);
      cerrarEliminar();
      await load();
      
      const mensaje = "Usuario eliminado correctamente.";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Éxito", mensaje);
      }
    } catch (e) {
      let mensajeError = "No se pudo eliminar el usuario. Intenta nuevamente.";
      
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
      
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeError}`);
      } else {
        Alert.alert("Error", mensajeError);
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Renderiza cada item de la lista
  const renderItem = ({ item }) => (
    <View
      style={{
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 4 }}>{item.username}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            {item.activo === 1 ? "● Activo" : "○ Inactivo"}
          </Text>
          {item.creado_en && (
            <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>
              Creado: {new Date(item.creado_en).toLocaleDateString()}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => abrirEditar(item)}
            style={{
              backgroundColor: "#3b82f6",
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", fontSize: 12 }}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => abrirEliminar(item)}
            style={{
              backgroundColor: "#ef4444",
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", fontSize: 12 }}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <View style={{ padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "800" }}>Usuarios</Text>
          <TouchableOpacity
            onPress={abrirCrear}
            style={{
              backgroundColor: "#10b981",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>+ Nuevo Usuario</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>Cargando usuarios...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ color: "#ef4444", textAlign: "center", marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity
            onPress={load}
            style={{
              backgroundColor: "#3b82f6",
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 12 }}>
            No hay usuarios registrados.
          </Text>
          <TouchableOpacity
            onPress={abrirCrear}
            style={{
              backgroundColor: "#10b981",
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Crear primer usuario</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Modal de creación/edición */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarEditar}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: "800" }}>
                {editingItem ? "Editar Usuario" : "Nuevo Usuario"}
              </Text>
              <TouchableOpacity onPress={cerrarEditar}>
                <Text style={{ fontSize: 24, color: "#6b7280" }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#374151" }}>
                  Nombre de usuario
                </Text>
                <TextInput
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="Ingresa el nombre de usuario"
                  style={{
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  autoCapitalize="none"
                  editable={!saving}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#374151" }}>
                  Contraseña {editingItem ? "(dejar vacío para no cambiar)" : ""}
                </Text>
                <TextInput
                  value={editPassword}
                  onChangeText={setEditPassword}
                  placeholder={editingItem ? "Nueva contraseña (opcional)" : "Ingresa la contraseña (mín. 4 caracteres)"}
                  secureTextEntry
                  style={{
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  editable={!saving}
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setEditActivo(!editActivo)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: editActivo ? "#d1fae5" : "#fee2e2",
                    borderRadius: 8,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: editActivo ? "#10b981" : "#ef4444",
                      marginRight: 12,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {editActivo && <Text style={{ color: "white", fontSize: 16 }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151" }}>
                    Usuario activo
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={guardarEdicion}
                disabled={saving}
                style={{
                  backgroundColor: saving ? "#9ca3af" : "#3b82f6",
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                    {editingItem ? "Guardar Cambios" : "Crear Usuario"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cerrarEliminar}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 12 }}>
              Confirmar eliminación
            </Text>
            <Text style={{ fontSize: 16, color: "#6b7280", marginBottom: 24 }}>
              ¿Estás seguro de que deseas eliminar al usuario "{itemToDelete?.username}"? Esta acción no se puede deshacer.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={cerrarEliminar}
                disabled={deletingId !== null}
                style={{
                  flex: 1,
                  backgroundColor: "#e5e7eb",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "700" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmarEliminar}
                disabled={deletingId !== null}
                style={{
                  flex: 1,
                  backgroundColor: deletingId !== null ? "#9ca3af" : "#ef4444",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                {deletingId === itemToDelete?.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "700" }}>Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
