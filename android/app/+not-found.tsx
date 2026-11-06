import { StyleSheet, View } from "react-native";

import { Button } from "@/components/Button";
import { ErrorPanel } from "@/components/ErrorPanel";
import { colors } from "@/theme/tokens";

export default function NotFoundScreen() {
  return (
    <View style={styles.page}>
      <ErrorPanel title="We couldn't find that page" action={<Button label="Back to Browse" href="/browse" />}>
        The address may be mistyped, or the page may have moved.
      </ErrorPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    justifyContent: "center",
  },
});
