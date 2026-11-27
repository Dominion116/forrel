import { PageHeader } from "@/components/app/primitives";

import { StatesGallery } from "./states-gallery";

export const metadata = {
  title: "Component states",
  robots: { index: false, follow: false },
};

/** Hidden review page (not linked anywhere): every component in every state. */
export default function DevStatesPage() {
  return (
    <>
      <PageHeader eyebrow="Dev · hidden" lead="Every component," title="Every state.">
        For UI review. Use the mock wallet controls to switch scenarios; the rest of the app follows.
      </PageHeader>
      <StatesGallery />
    </>
  );
}
