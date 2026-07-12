import { useLocalStorage } from "@mantine/hooks";
import type { RecipeStub } from "./Recipes";
import { useAuth } from "react-oidc-context";
import { useCallback, useMemo } from "react";

const EXPIRY_MS = 4 * 60 * 60 * 1000;
const MAX_RECENT_RECIPES = 3

export type RecentRecipe = {
    title: string;
    id: string;
    expiresAt: number;
}

export type UseRecentRecipesReturnValue = {
    recentRecipes: RecentRecipe[];
    addRecentRecipe: (recipe: RecipeStub) => void;
    removeRecentRecipe: (id: string) => void;
    clearRecentRecipes: () => void;
}

const getValidItems = (currentItems: RecentRecipe[]) => {
    const now = Date.now()
    return currentItems.filter((item) => item.expiresAt > now)
}

export const useRecentRecipes = (): UseRecentRecipesReturnValue => {
    const auth = useAuth()
    const userId = auth.user?.profile.sub

    const [recentRecipes, setRecentRecipes, removeRecentRecipes] = useLocalStorage<RecentRecipe[]>({ key: `recent-recipes-${userId}`, defaultValue: [] })

    const validRecipes = useMemo(() => getValidItems(recentRecipes), [recentRecipes]);

    const addRecentRecipe = useCallback((newRecipe: RecipeStub) => {
        setRecentRecipes((prev) => {
            const validItems = getValidItems(prev)
            
            // Check duplicate
            if (validItems.some((item) => item.id === newRecipe.id)) {
                return prev; 
            }

            // Enforce max limits safely without mutating state arrays directly
            const slicedItems = validItems.length >= MAX_RECENT_RECIPES 
                ? validItems.slice(0, MAX_RECENT_RECIPES - 1) 
                : validItems;

            return [{ ...newRecipe, expiresAt: Date.now() + EXPIRY_MS }, ...slicedItems];
        });
    }, [setRecentRecipes]);

    const removeRecentRecipe = useCallback((id: string) => {
        setRecentRecipes((prev) => prev.filter((item) => item.id !== id));
    }, [setRecentRecipes]);

    const clearRecentRecipes = useCallback(() => {
        removeRecentRecipes();
    }, [removeRecentRecipes]);

    return { recentRecipes: validRecipes, addRecentRecipe, removeRecentRecipe, clearRecentRecipes }
}