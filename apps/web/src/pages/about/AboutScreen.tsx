import React from 'react';
import { View, Text, ScrollView, Linking } from 'react-native';
import { Button } from "../../components/ui/Button";
import { styles } from "@gokan-srs/ui";

interface AboutScreenProps {
    onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
    return (
        <ScrollView style={[styles.flex1, styles.wFull, styles.bgBackground]} contentContainerStyle={[styles.alignCenter, styles.px4, styles.py6]}>
            <View style={[styles.wFull, { maxWidth: 768 }]}>
                {/* Header */}
                <View style={[styles.wFull, styles.flexRow, styles.alignCenter, styles.mb8, styles.relative, { height: 44 }]}>
                    <Button
                        variant="ghost"
                        onPress={onBack}
                        style={[styles.absolute, { left: 0, zIndex: 10 }]}
                    >
                        ← Back
                    </Button>

                    <Text style={[styles.flex1, styles.textCenter, styles.textXl, styles.fontSerif, styles.textPrimary]}>
                        About Gokan SRS
                    </Text>
                </View>

                {/* Content */}
                <View style={[styles.wFull, styles.gap8]}>
                    <View>
                        <Text style={[styles.textLg, styles.fontSerif, styles.textPrimary, styles.mb3]}>
                            Why I Built This
                        </Text>
                        <Text style={[styles.textSecondary, styles.mb3, { lineHeight: 24 }]}>
                            I'm learning Japanese, and I kept running into the same frustrating problem: I'd be reading something, understand the kanji, but completely blank on the vocabulary. I knew the individual characters, but the words themselves? Gone.
                        </Text>
                        <Text style={[styles.textSecondary, { lineHeight: 24 }]}>
                            I'm too lazy to manually track all these words in a notebook or spreadsheet. I just wanted something simple that would help me remember the vocabulary I encounter while reading. So I built Gokan.
                        </Text>
                    </View>

                    <View>
                        <Text style={[styles.textLg, styles.fontSerif, styles.textPrimary, styles.mb3]}>
                            What It Does
                        </Text>
                        <Text style={[styles.textSecondary, styles.mb3, { lineHeight: 24 }]}>
                            Gokan uses spaced repetition to help you learn Japanese vocabulary based on the kanji you already know. You set your kanji level, and it shows you words you can actually read. Review them when they're due, and the app handles the rest.
                        </Text>
                        <Text style={[styles.textSecondary, { lineHeight: 24 }]}>
                            I use it every day myself. It's free, no ads, no premium tiers. Just a tool I made to solve my own problem, and I'm sharing it in case it helps you too.
                        </Text>
                    </View>

                    <View>
                        <Text style={[styles.textLg, styles.fontSerif, styles.textPrimary, styles.mb3]}>
                            Data Sources
                        </Text>
                        <Text style={[styles.textSecondary, { lineHeight: 24 }]}>
                            Vocabulary data comes from{" "}
                            <Text
                                onPress={() => Linking.openURL('https://jpdb.io')}
                                style={[styles.textPrimary, { textDecorationLine: 'underline' }]}
                            >
                                JPDB
                            </Text>
                            {" "}and definitions from{" "}
                            <Text
                                onPress={() => Linking.openURL('https://www.edrdg.org/jmdict/j_jmdict.html')}
                                style={[styles.textPrimary, { textDecorationLine: 'underline' }]}
                            >
                                JMDict
                            </Text>
                            . Both are open-source and widely trusted in the Japanese learning community.
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
