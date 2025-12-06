// front/App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ProgramarEvaluacionScreen from "./src/screens/ProgramarEvaluacionScreen";
import CodigosScreen from "./src/screens/CodigosScreen";
import IngresarCodigoScreen from "./src/screens/IngresarCodigoScreen";
import RealizarEvaluacionScreen from "./src/screens/RealizarEvaluacionScreen";
import EvaluacionesScreen from "./src/screens/EvaluacionesScreen";
import EvaluacionesAcumuladasScreen from "./src/screens/EvaluacionesAcumuladasScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
