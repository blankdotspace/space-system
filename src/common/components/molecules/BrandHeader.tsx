import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../atoms/tooltip";
import { Tooltip, TooltipArrow } from "@radix-ui/react-tooltip";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Londrina_Solid } from "next/font/google";
import { SystemConfig } from "@/config";

const Londrina = Londrina_Solid({ subsets: ["latin"], weight: "400" });

type BrandHeaderProps = {
  systemConfig: SystemConfig;
};

const BrandHeader = ({ systemConfig }: BrandHeaderProps) => {
  const { assets, brand, navigation } = systemConfig;
  const logoTooltip = navigation?.logoTooltip;
  const logoSrc = assets.logos.icon || assets.logos.main;

  // Check if the logo is an SVG (use regular img tag for security - SVGs can contain scripts)
  const isSvg = logoSrc?.toLowerCase().endsWith('.svg');

  const logoImage = (
    <div className="w-12 h-8 sm:w-16 sm:h-10 me-3 flex items-center justify-center">
      {isSvg ? (
        // Use regular img tag for SVGs to avoid Next.js Image optimization issues
        // SVGs are rendered in an img tag context which prevents script execution
        <img
          src={logoSrc}
          alt={`${brand.displayName} Logo`}
          className="w-full h-full object-contain"
        />
      ) : (
        <Image
          src={logoSrc}
          alt={`${brand.displayName} Logo`}
          width={60}
          height={40}
          priority
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );

  return (
    <>
      {logoTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <Link
              href="/home"
              className="flex items-center ps-2.5"
              rel="noopener noreferrer"
            >
              <TooltipTrigger asChild>{logoImage}</TooltipTrigger>
            </Link>
            <TooltipContent className="bg-gray-200 font-black" side="left">
              <TooltipArrow className="fill-gray-200" />
              <div className="flex flex-col gap-1">
                {logoTooltip.href ? (
                  <a
                    className={`text-black text-base ${Londrina.className}`}
                    href={logoTooltip.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {logoTooltip.text}
                    <FaExternalLinkAlt className="inline ml-1 mb-1" />
                  </a>
                ) : (
                  <span className={`text-black text-base ${Londrina.className}`}>
                    {logoTooltip.text}
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Link
          href="/home"
          className="flex items-center ps-2.5"
          rel="noopener noreferrer"
        >
          {logoImage}
        </Link>
      )}

    </>
  );
};

export default BrandHeader;
