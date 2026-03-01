import { StyleSheet } from 'react-native';
import { THEME } from '@gokan-srs/core/commons/theme';

export const styles = StyleSheet.create({
    // Layout
    flex1: { flex: 1 },
    flexRow: { flexDirection: 'row' },
    flexCol: { flexDirection: 'column' },
    flexWrap: { flexWrap: 'wrap' },
    flexCenter: { justifyContent: 'center', alignItems: 'center' },
    justifyBetween: { justifyContent: 'space-between' },
    justifyCenter: { justifyContent: 'center' },
    justifyEnd: { justifyContent: 'flex-end' },
    alignCenter: { alignItems: 'center' },
    alignStart: { alignItems: 'flex-start' },
    alignEnd: { alignItems: 'flex-end' },

    // Gaps
    gap1: { gap: 4 },
    gap2: { gap: 8 },
    gap3: { gap: 12 },
    gap4: { gap: 16 },
    gap5: { gap: 20 },
    gap6: { gap: 24 },
    gap8: { gap: 32 },

    // Backgrounds
    bgBackground: { backgroundColor: THEME.colors.background },
    bgSurface: { backgroundColor: THEME.colors.surface },
    bgFeedback: { backgroundColor: THEME.colors.feedbackBackground },
    bgAccent: { backgroundColor: THEME.colors.accent },
    bgError: { backgroundColor: THEME.colors.error },

    // Typography - Colors
    textPrimary: { color: THEME.colors.primary },
    textSecondary: { color: THEME.colors.secondary },
    textTertiary: { color: THEME.colors.tertiary },
    textAccent: { color: THEME.colors.accent },
    textError: { color: THEME.colors.error },
    textWhite: { color: '#FFFFFF' },
    textMuted: { color: THEME.colors.muted },

    // Typography - Fonts
    fontSerif: { fontFamily: THEME.fonts.serif },
    fontMincho: { fontFamily: THEME.fonts.mincho },
    fontGothic: { fontFamily: THEME.fonts.gothic },

    // Typography - Sizes
    textXs: { fontSize: 12 },
    textSm: { fontSize: 14 },
    textBase: { fontSize: 16 },
    textLg: { fontSize: 18 },
    textXl: { fontSize: 20 },
    text2xl: { fontSize: 24 },
    text3xl: { fontSize: 30 },
    text4xl: { fontSize: 36 },
    text5xl: { fontSize: 48 },
    textKanji: { fontSize: 105.6, lineHeight: 105.6 }, // Handled dynamically in components if relative sizing is needed

    // Typography - Weights
    fontNormal: { fontWeight: '400' },
    fontMedium: { fontWeight: '500' },
    fontSemibold: { fontWeight: '600' },
    fontBold: { fontWeight: '700' },

    // Text Alignment
    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    textLeft: { textAlign: 'left' },

    // Borders & Rounded
    roundedNone: { borderRadius: 0 },
    roundedSm: { borderRadius: 4 },
    rounded: { borderRadius: 6 },
    roundedMd: { borderRadius: 8 },
    roundedLg: { borderRadius: 12 },
    roundedFull: { borderRadius: 9999 },

    border: { borderWidth: 1, borderColor: THEME.colors.divider },
    borderBottom: { borderBottomWidth: 1, borderBottomColor: THEME.colors.divider },
    borderTop: { borderTopWidth: 1, borderTopColor: THEME.colors.divider },
    borderAccent: { borderColor: THEME.colors.accent },
    borderError: { borderColor: THEME.colors.error },

    // Margins
    m4: { margin: 16 },
    mt1: { marginTop: 4 },
    mt2: { marginTop: 8 },
    mt3: { marginTop: 12 },
    mt4: { marginTop: 16 },
    mt6: { marginTop: 24 },
    mt8: { marginTop: 32 },
    mb1: { marginBottom: 4 },
    mb2: { marginBottom: 8 },
    mb3: { marginBottom: 12 },
    mb4: { marginBottom: 16 },
    mb6: { marginBottom: 24 },
    mb8: { marginBottom: 32 },
    ml1: { marginLeft: 4 },
    ml2: { marginLeft: 8 },
    ml4: { marginLeft: 16 },
    mr2: { marginRight: 8 },
    mr4: { marginRight: 16 },
    my4: { marginVertical: 16 },
    my8: { marginVertical: 32 },
    mxAuto: { marginHorizontal: 'auto' },

    // Paddings
    p2: { padding: 8 },
    p3: { padding: 12 },
    p4: { padding: 16 },
    p6: { padding: 24 },
    px2: { paddingHorizontal: 8 },
    px4: { paddingHorizontal: 16 },
    px6: { paddingHorizontal: 24 },
    px8: { paddingHorizontal: 32 },
    py2: { paddingVertical: 8 },
    py3: { paddingVertical: 12 },
    py4: { paddingVertical: 16 },
    py8: { paddingVertical: 32 },

    // Layout Utility
    wFull: { width: '100%' },
    hFull: { height: '100%' },
    wScreen: { width: '100vw' },
    hScreen: { height: '100vh' },

    absolute: { position: 'absolute' },
    relative: { position: 'relative' },
    inset0: { top: 0, left: 0, right: 0, bottom: 0 },

    // App-specific components equivalents
    card: {
        backgroundColor: THEME.colors.surface,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent', // Light mode web doesn't always have border unless dark
    },
});
