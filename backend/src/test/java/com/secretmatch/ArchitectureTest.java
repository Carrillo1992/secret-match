package com.secretmatch;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption.DoNotIncludeTests;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** The module and layer rules of docs/architecture.md §2.1. */
@AnalyzeClasses(packages = "com.secretmatch", importOptions = DoNotIncludeTests.class)
class ArchitectureTest {

    private static final Pattern MODULE_LAYER = Pattern.compile("com\\.secretmatch\\.(\\w+)\\.(\\w+)(\\..*)?");
    private static final Pattern APPLICATION_API = Pattern.compile("com\\.secretmatch\\.\\w+\\.application(\\..*)?");
    private static final Pattern SHARED_DOMAIN = Pattern.compile("com\\.secretmatch\\.shared\\.domain(\\..*)?");

    @ArchTest
    static final ArchRule layersDependInwards = layeredArchitecture()
            .consideringOnlyDependenciesInAnyPackage("com.secretmatch..")
            .withOptionalLayers(true)
            .layer("Domain")
            .definedBy("com.secretmatch.*.domain..")
            .layer("Application")
            .definedBy("com.secretmatch.*.application..")
            .layer("Infrastructure")
            .definedBy("com.secretmatch.*.infrastructure..")
            .whereLayer("Infrastructure")
            .mayNotBeAccessedByAnyLayer()
            .whereLayer("Application")
            .mayOnlyBeAccessedByLayers("Infrastructure")
            .whereLayer("Domain")
            .mayOnlyBeAccessedByLayers("Application", "Infrastructure");

    @ArchTest
    static final ArchRule domainIsPlainJava = noClasses()
            .that()
            .resideInAPackage("com.secretmatch.*.domain..")
            .should()
            .dependOnClassesThat()
            .resideOutsideOfPackages("java..", "com.secretmatch..")
            .allowEmptyShould(true)
            .because("domain code depends on nothing outside the JDK");

    @ArchTest
    static final ArchRule modulesMeetOnlyThroughApplicationApis = classes()
            .that()
            .resideInAPackage("com.secretmatch.*..")
            .should(onlyUseOtherModulesThroughTheirApplicationApi())
            .allowEmptyShould(true)
            .because("a module uses another module only through its application API (or shared.domain)");

    private static ArchCondition<JavaClass> onlyUseOtherModulesThroughTheirApplicationApi() {
        return new ArchCondition<>("only use other modules through their application API") {
            @Override
            public void check(JavaClass origin, ConditionEvents events) {
                Optional<String> originModule = moduleOf(origin);
                origin.getDirectDependenciesFromSelf().forEach(dependency -> {
                    JavaClass target = dependency.getTargetClass();
                    Optional<String> targetModule = moduleOf(target);
                    boolean crossesModules =
                            originModule.isPresent() && targetModule.isPresent() && !originModule.equals(targetModule);
                    if (crossesModules && !isPublicApi(target)) {
                        events.add(SimpleConditionEvent.violated(dependency, dependency.getDescription()));
                    }
                });
            }
        };
    }

    private static Optional<String> moduleOf(JavaClass javaClass) {
        Matcher matcher = MODULE_LAYER.matcher(javaClass.getPackageName());
        return matcher.matches() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    private static boolean isPublicApi(JavaClass target) {
        return APPLICATION_API.matcher(target.getPackageName()).matches()
                || SHARED_DOMAIN.matcher(target.getPackageName()).matches();
    }
}
