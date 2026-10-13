export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5 py-0.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <img src="/icon.png" alt="Angora Work OS" className="h-8 w-8 shrink-0 rounded-xl object-contain shadow-md" />
            <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-1 text-sm leading-tight font-extrabold tracking-tight text-white">
                    <span>angora</span>
                    <span className="font-bold text-[#D8F779]">.work</span>
                </div>
                <span className="mt-0.5 text-[10px] leading-tight font-medium tracking-wide text-slate-400">Enterprise Work OS</span>
            </div>
        </div>
    );
}
