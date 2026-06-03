declare module '@ideditor/schema-builder' {
    export interface SchemaBuilderOptions {
        inDirectory?: string;
        interimDirectory?: string;
        outDirectory?: string;
        sourceLocale?: string;
    }

    const schemaBuilder: {
        buildDist(options: SchemaBuilderOptions): Promise<void>;
        buildDev(options: SchemaBuilderOptions): void;
        validate(options: SchemaBuilderOptions): void;
    };

    export default schemaBuilder;
}
