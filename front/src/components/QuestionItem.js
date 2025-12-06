import { View, Text, TouchableOpacity } from "react-native";
const SCALE = [1, 2, 3, 4, 5];

export default function QuestionItem({ q, value, onChange }) {
  return (
    <View style={{ marginBottom: 14, padding: 12, backgroundColor: "#f5f7fb", borderRadius: 10 }}>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>
        {q.id}. {q.texto}  [{q.dimension}]
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {SCALE.map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(q.id, v)}
            activeOpacity={0.85}
            style={{
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
              borderWidth: 1, borderColor: value === v ? "#2563eb" : "#cbd5e1",
              backgroundColor: value === v ? "#e6efff" : "#fff",
              marginRight: 8, marginBottom: 8
            }}
          >
            <Text style={{ fontWeight: "700" }}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
