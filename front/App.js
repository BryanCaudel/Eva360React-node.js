import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, StyleSheet } from "react-native";

import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ProgramarEvaluacionScreen from "./src/screens/ProgramarEvaluacionScreen";
import CodigosScreen from "./src/screens/CodigosScreen";
import IngresarCodigoScreen from "./src/screens/IngresarCodigoScreen";
import RealizarEvaluacionScreen from "./src/screens/RealizarEvaluacionScreen";
import EvaluacionesScreen from "./src/screens/EvaluacionesScreen";
import EvaluacionesAcumuladasScreen from "./src/screens/EvaluacionesAcumuladasScreen";
import UsuariosScreen from "./src/screens/UsuariosScreen";

const Stack = createNativeStackNavigator();

// Componente que captura errores de JavaScript y los muestra en lugar de crashear la app
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ERROR EN APP:", error);
    console.error("ERROR INFO:", errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error al cargar la aplicación</Text>
          <Text style={styles.errorText}>
            {this.state.error?.toString() || "Error desconocido"}
          </Text>
          {this.state.error?.message && (
            <Text style={styles.errorDetails}>
              {this.state.error.message}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

// Estilos para la pantalla de error
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff"
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#ef4444"
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
    textAlign: "center"
  },
  errorDetails: {
    fontSize: 12,
    color: "#999",
    marginTop: 10,
    textAlign: "center"
  }
});

// Componente principal: configura la navegación entre pantallas
export default function App() {
  try {
    return (
      <ErrorBoundary>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerTitleAlign: "left" }}>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Login" }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Dashboard" }} />
            <Stack.Screen name="ProgramarEvaluacion" component={ProgramarEvaluacionScreen} options={{ title: "Programar evaluación" }} />
            <Stack.Screen name="Codigos" component={CodigosScreen} options={{ title: "Códigos" }} />
            <Stack.Screen name="IngresarCodigo" component={IngresarCodigoScreen} options={{ title: "Ingresar código" }} />
            <Stack.Screen name="RealizarEvaluacion" component={RealizarEvaluacionScreen} options={{ title: "Realizar evaluación" }} />
            <Stack.Screen name="Evaluaciones" component={EvaluacionesScreen} options={{ title: "Evaluaciones (sesión)" }} />
            <Stack.Screen name="EvaluacionesAcumuladas" component={EvaluacionesAcumuladasScreen} options={{ title: "Promedio por evaluado" }} />
            <Stack.Screen name="Usuarios" component={UsuariosScreen} options={{ title: "Usuarios" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("ERROR AL RENDERIZAR APP:", error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error al iniciar</Text>
        <Text style={styles.errorText}>{error.toString()}</Text>
        {error.stack && (
          <Text style={styles.errorDetails}>{error.stack.substring(0, 300)}</Text>
        )}
      </View>
    );
  }
}
