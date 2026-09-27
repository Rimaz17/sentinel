package io.github.rimaz17.sentinel.reports;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores an age band by its label, as in "30-39", so the column reads plainly. */
@Converter(autoApply = true)
class AgeBandConverter implements AttributeConverter<AgeBand, String> {

  @Override
  public String convertToDatabaseColumn(AgeBand band) {
    return band == null ? null : band.label();
  }

  @Override
  public AgeBand convertToEntityAttribute(String label) {
    return label == null ? null : AgeBand.ofLabel(label);
  }
}
