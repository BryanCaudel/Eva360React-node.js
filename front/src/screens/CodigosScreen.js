import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from "react-native";
import { listarCodigos, actualizarCodigo, eliminarCodigo } from "../api";

export default function CodigosScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCodigo, setEditCodigo] = useState("");
  const [editActivo, setEditActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);


  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await listarCodigos();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Error cargando códigos");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listarCodigos();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Error cargando códigos");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const abrirEditar = (item) => {
    setEditingItem(item);
    setEditNombre(item.evaluado_nombre || "");
    setEditCodigo(item.codigo || "");
    setEditActivo(item.activo === 1);
    setEditModalVisible(true);
  };

  const cerrarEditar = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditNombre("");
    setEditCodigo("");
    setEditActivo(true);
  };

  const guardarEdicion = async () => {
    if (!editingItem) return;
    
    if (!editNombre.trim()) {
      Alert.alert("Error", "El nombre del evaluado es requerido");
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
      Alert.alert("Éxito", "Código actualizado correctamente");
    } catch (e) {
      Alert.alert("Error", e.message || "No se pudo actualizar el código");
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = (item) => {
    if (!item || !item.id) {
      Alert.alert("Error", "Información del código inválida");
      return;
    }

    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const confirmarEliminacionFinal = () => {
    if (itemToDelete) {
      setDeleteModalVisible(false);
      eliminar(itemToDelete);
      setItemToDelete(null);
    }
  };

  const cancelarEliminacion = () => {
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  const eliminar = async (item) => {
    setDeletingId(item.id);
    try {
      const resultado = await eliminarCodigo(item.id);
      await load();
      if (resultado && resultado.desactivado) {
        Alert.alert("Código desactivado", "El código fue desactivado porque tiene sesiones con respuestas asociadas");
      } else {
        Alert.alert("Éxito", "Código eliminado correctamente");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "No se pudo eliminar el código");
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

      {/* Modal de edición */}
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

      {/* Modal de confirmación de eliminación */}
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
