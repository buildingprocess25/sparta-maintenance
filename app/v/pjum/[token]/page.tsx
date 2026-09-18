import { ValidatorContent } from "./validator-content";
import { getPublicPjumVerification } from "./validator-data";

export const dynamic = "force-dynamic";

export default async function PjumValidatorPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const result = await getPublicPjumVerification(token);

    return <ValidatorContent result={result} />;
}
