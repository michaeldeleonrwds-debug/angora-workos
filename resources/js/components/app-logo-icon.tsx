import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({ className, alt = 'Angora Work OS', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return <img src="/icon.png" alt={alt} className={`rounded-xl object-contain shadow-sm ${className || 'h-8 w-8'}`} {...props} />;
}
