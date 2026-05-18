import React from 'react';
import { StyleSheet } from 'react-native';

const flattenStyle = (style: any) => {
    const flattened = StyleSheet.flatten(style);
    const flat = flattened ? { ...flattened } : {};
    if (Array.isArray(flat.transform)) {
        delete flat.transform;
    }
    return flat;
};

export const Svg = ({ children, style, ...props }: React.SVGProps<SVGSVGElement> & { style?: any }) => (
    <svg {...props} style={flattenStyle(style)}>{children}</svg>
);
export const Line = ({ style, ...props }: React.SVGProps<SVGLineElement> & { style?: any }) => <line {...props} style={flattenStyle(style)} />;
export const Path = ({ style, ...props }: React.SVGProps<SVGPathElement> & { style?: any }) => <path {...props} style={flattenStyle(style)} />;
export const Circle = ({ style, ...props }: React.SVGProps<SVGCircleElement> & { style?: any }) => <circle {...props} style={flattenStyle(style)} />;
export const Text = ({ alignmentBaseline: _, style, ...props }: React.SVGProps<SVGTextElement> & { alignmentBaseline?: string, style?: any }) => (
    <text dominantBaseline="central" {...props} style={flattenStyle(style)} />
);
export const G = ({ style, ...props }: React.SVGProps<SVGGElement> & { style?: any }) => <g {...props} style={flattenStyle(style)} />;
export default Svg;