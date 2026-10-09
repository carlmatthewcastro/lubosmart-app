import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-11 shrink-0 items-center justify-center group-data-[collapsible=icon]:size-10">
                <AppLogoIcon className="size-11 group-data-[collapsible=icon]:size-10" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm group-data-[collapsible=icon]:hidden">
                <span className="mb-0.5 truncate leading-none font-semibold">LubosMart</span>
                <span className="text-muted-foreground mt-1 text-[10px] tracking-widest uppercase">Closer to home</span>
            </div>
        </>
    );
}
