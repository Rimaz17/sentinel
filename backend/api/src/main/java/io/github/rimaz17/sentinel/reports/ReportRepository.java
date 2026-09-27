package io.github.rimaz17.sentinel.reports;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReportRepository extends JpaRepository<Report, UUID> {}
