export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5 py-0.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <img src="/icon.png" alt="Angora" className="h-8 w-8 shrink-0 rounded-xl object-contain shadow-md" />
            <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden">
                <span className="text-base leading-tight font-extrabold tracking-tight text-white">
                    Angora
                </span>
            </div>
        </div>
    );
}
