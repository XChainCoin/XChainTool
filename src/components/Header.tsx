import "./head.css";

import { AppBar, Box, IconButton, useTheme } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const nav = [
    {
      title: "Inscription",
      link: "/",
    },
    {
      title: "Ierc Pow",
      link: "/ierc",
    },
  ];

  return (
    <div
      className="navBar"
    >
      <h1 className="titFlex flex items-center gap-2 text-3xl font-bold">
        <a className="tit" href="/">X Chain Inscriptions Auto Mint Tool<br />(X Chain铭文自动铸造工具)</a>
      </h1>

      <div className=" flex h-full items-center gap-4 text-xl font-semibold">
        {nav.map(({ title, link }) => (
          <Box
            component={Link}
            key={link}
            href={link}
            className="ay flex h-full items-center"
            sx={(theme) => ({
              color:
                link === pathname
                  ? theme.palette.text.primary
                  : '#aaaaff',
              borderBottom: link === pathname ? `2px solid #674eff` : 'none',
              "&:hover": {
                color: theme.palette.text.primary,
              },
            })}
          >
            {title}
          </Box>
        ))}
      </div>
    </div>
  );
}
