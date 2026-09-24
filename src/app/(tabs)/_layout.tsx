import { type BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BagIcon, ChecklistIcon, GridIcon } from '@/components/icons';
import { Fonts, TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_META: Record<string, { label: string; Icon: typeof GridIcon }> = {
  index: { label: 'Recipes', Icon: GridIcon },
  ingredients: { label: 'Ingredients', Icon: ChecklistIcon },
  groceries: { label: 'Groceries', Icon: BagIcon },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.line,
          height: TabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;

        const focused = state.index === index;
        const color = focused ? theme.accent : theme.inkFaint;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={meta.label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}>
            <meta.Icon size={23} color={color} />
            <Text
              style={[
                styles.label,
                { color, fontFamily: focused ? Fonts.bodySemi : Fonts.bodyMedium },
              ]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ingredients" />
      <Tabs.Screen name="groceries" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
  },
});
