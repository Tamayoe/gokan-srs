import React from 'react';

export const Svg = ({ children, style, ...props }: React.SVGProps<SVGSVGElement> & { style?: any }) => (
    <svg {...props} style={style}>{children}</svg>
);
export const Line = (props: React.SVGProps<SVGLineElement>) => <line {...props} />;
export const Path = (props: React.SVGProps<SVGPathElement>) => <path {...props} />;
export const Circle = (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />;
export const Text = ({ alignmentBaseline: _, ...props }: React.SVGProps<SVGTextElement> & { alignmentBaseline?: string }) => (
    <text dominantBaseline="central" {...props} />
);
export const G = (props: React.SVGProps<SVGGElement>) => <g {...props} />;
export default Svg;