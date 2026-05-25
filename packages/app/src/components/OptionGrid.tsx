import { View, Text, Pressable } from "react-native";
import { styles, THEME } from "@gokan-srs/ui";

import type { ReactNode } from "react";

export const OptionGrid = <T extends string>(props: {
    title: string;
    options: { value: T; label: string; description: ReactNode }[];
    value: T;
    onChange?: (v: T) => void;
}) => {
    return (
        <View style={styles.gap3}>
            <Text style={[styles.textSm, styles.fontGothic, styles.textSecondary, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                {props.title}
            </Text>
            <View style={[styles.flexRow, styles.flexWrap, { gap: 16 }]}>
                {props.options.map((opt) => {
                    const selected = opt.value === props.value;
                    return (
                        <Pressable
                            key={opt.value}
                            onPress={() => props.onChange?.(opt.value)}
                            style={({ pressed, hovered }: any) => [
                                styles.flexCol,
                                styles.p5,
                                styles.border,
                                { borderRadius: 12, flex: 1, minWidth: 150 },
                                selected
                                    ? { borderColor: THEME.colors.accent, backgroundColor: THEME.colors.accentFaint }
                                    : { borderColor: THEME.colors.divider, backgroundColor: pressed || hovered ? THEME.colors.surfaceHover : THEME.colors.surface }
                            ] as any}
                        >
                            <Text style={[styles.textLg, styles.fontSerif, styles.textPrimary, styles.mb1]}>
                                {opt.label}
                            </Text>
                            <Text style={[styles.textXs, styles.fontSerif, styles.textSecondary]}>
                                {opt.description}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};